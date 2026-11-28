// Game state + reducer for 502. Used with React's useReducer.
// Every action returns a NEW state object; invalid actions return the old state unchanged.

import { createDeck, shuffle, cardLabel, SUITS, SUIT_NAME } from './deck.js';
import {
  ELIMINATION_SCORE,
  HAND_SIZE,
  TWO_PENALTY,
  ACE_PENALTY,
  isSevenOfHearts,
  isAceOfSpades,
  handPoints,
  isValidStartCard,
  canPlayCard,
} from './rules.js';

const BOT_NAMES = ['Nova', 'Rex', 'Pixel', 'Juno', 'Blitz'];

// ---------- helpers ----------

function cloneState(s) {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, hand: [...p.hand] })),
    drawPile: [...s.drawPile],
    discardPile: [...s.discardPile],
  };
}

export const activePlayers = (s) => s.players.filter((p) => !p.eliminated);
export const topCard = (s) => s.discardPile[s.discardPile.length - 1];

/** Index of the next player (clockwise) who is still in the game. */
export function nextActiveIndex(s, from) {
  const n = s.players.length;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (!s.players[i].eliminated) return i;
  }
  return from;
}

/** Draw up to `count` cards. Reshuffles the discard pile (except its top card) when the draw pile runs out. */
function drawCards(s, playerIndex, count) {
  let drawn = 0;
  for (let k = 0; k < count; k++) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length <= 1) break; // nothing left to recycle
      const top = s.discardPile.pop();
      s.drawPile = shuffle(s.discardPile);
      s.discardPile = [top];
    }
    s.players[playerIndex].hand.push(s.drawPile.pop());
    drawn++;
  }
  return drawn;
}

function mostCommonSuit(hand) {
  const counts = { S: 0, H: 0, D: 0, C: 0 };
  hand.forEach((c) => {
    if (c.rank !== 'J') counts[c.suit]++;
  });
  return SUITS.reduce((best, s) => (counts[s] > counts[best] ? s : best), 'S');
}

// ---------- setup ----------

export function createGame({ humanName = 'You', botCount = 3 } = {}) {
  const bots = Math.min(5, Math.max(1, botCount | 0));
  const players = [
    { id: 'p0', name: humanName, isHuman: true, score: 0, eliminated: false, hand: [] },
    ...BOT_NAMES.slice(0, bots).map((name, i) => ({
      id: `p${i + 1}`,
      name,
      isHuman: false,
      score: 0,
      eliminated: false,
      hand: [],
    })),
  ];
  return dealRound(
    { players, round: 0, setup: { humanName, botCount: bots }, championIndex: null, history: [] },
    0
  );
}

function dealRound(prev, starterIndex) {
  const s = { ...prev, players: prev.players.map((p) => ({ ...p, hand: [] })) };
  const deck = shuffle(createDeck());

  for (let k = 0; k < HAND_SIZE; k++) {
    for (const p of s.players) if (!p.eliminated) p.hand.push(deck.pop());
  }

  // Turn up a start card; illegal start cards go to the bottom of the pile.
  while (!isValidStartCard(deck[deck.length - 1])) deck.unshift(deck.pop());
  const start = deck.pop();

  return {
    ...s,
    drawPile: deck,
    discardPile: [start],
    activeSuit: start.suit,
    current: starterIndex,
    starter: starterIndex,
    pending: null,
    round: prev.round + 1,
    phase: 'playing', // 'playing' | 'roundOver' | 'gameOver'
    roundResult: null,
    emptyPasses: 0,
    message: `Round ${prev.round + 1}: ${s.players[starterIndex].name} goes first`,
    lastEvent: { kind: 'deal', at: Date.now() },
  };
}

// ---------- round end + scoring ----------

function endRound(s, winnerIndex, reason) {
  const results = s.players.map((p, i) => {
    const wasActive = !p.eliminated;
    // Everyone still in scores the cards left in hand. The winner too: going out leaves 0 cards,
    // but a 7♥ winner still counts whatever they are holding.
    const points = wasActive ? handPoints(p.hand) : 0;
    return { id: p.id, name: p.name, points, cardsLeft: p.hand.length, wasActive };
  });

  const newlyEliminated = [];
  s.players.forEach((p, i) => {
    p.score += results[i].points;
    results[i].total = p.score;
    // The round winner can never be eliminated in the round they won.
    if (results[i].wasActive && i !== winnerIndex && p.score >= ELIMINATION_SCORE) {
      p.eliminated = true;
      newlyEliminated.push(p.id);
    }
  });

  s.roundResult = { winnerIndex, reason, results, newlyEliminated };
  s.history = [...s.history, { round: s.round, winnerIndex, reason }];
  s.pending = null;

  const remaining = s.players.map((p, i) => i).filter((i) => !s.players[i].eliminated);
  if (remaining.length <= 1) {
    s.phase = 'gameOver';
    if (remaining.length === 1) {
      s.championIndex = remaining[0];
    } else {
      // Everyone crossed 502 in the same round: lowest total wins.
      const roundPlayers = results.map((r, i) => i).filter((i) => results[i].wasActive);
      s.championIndex = roundPlayers.reduce((best, i) =>
        s.players[i].score < s.players[best].score ? i : best
      );
    }
  } else {
    s.phase = 'roundOver';
  }
  s.lastEvent = { kind: 'roundEnd', at: Date.now() };
  return s;
}

// ---------- reducer ----------

export function gameReducer(state, action) {
  switch (action.type) {
    case 'PLAY':
      return playCard(state, action);
    case 'DRAW':
      return draw(state, action);
    case 'ACCEPT_SKIP':
      return acceptSkip(state, action);
    case 'NEXT_ROUND':
      if (state.phase !== 'roundOver') return state;
      return dealRound(state, nextRoundStarter(state));
    case 'RESTART':
      return createGame(state.setup);
    default:
      return state;
  }
}

/**
 * The player who scored the fewest points last round starts the next one.
 * Ties go to the round winner, then to the first tied player clockwise from the winner.
 */
function nextRoundStarter(state) {
  const { winnerIndex, results } = state.roundResult;
  const n = state.players.length;
  let best = null;
  for (let step = 0; step < n; step++) {
    const i = (winnerIndex + step) % n;
    if (state.players[i].eliminated) continue;
    if (best === null || results[i].points < results[best].points) best = i;
  }
  return best ?? nextActiveIndex(state, state.starter);
}

function isTurnOf(state, playerIndex) {
  return (
    state.phase === 'playing' &&
    playerIndex === state.current &&
    !!state.players[playerIndex] &&
    !state.players[playerIndex].eliminated
  );
}

function playCard(state, { player, cardId, suit }) {
  if (!isTurnOf(state, player)) return state;
  const hand = state.players[player].hand;
  const card = hand.find((c) => c.id === cardId);
  if (!card || !canPlayCard(card, topCard(state), state.activeSuit, state.pending)) return state;

  const s = cloneState(state);
  const me = s.players[player];
  me.hand = me.hand.filter((c) => c.id !== cardId);
  s.discardPile.push(card);
  s.emptyPasses = 0;
  s.lastEvent = { kind: 'play', player, cardId, at: Date.now() };

  // 7 of Hearts: instant round win.
  if (isSevenOfHearts(card)) {
    s.message = `${me.name} slammed the 7♥ and won the round!`;
    return endRound(s, player, 'seven');
  }

  if (card.rank === 'J') {
    s.activeSuit = SUITS.includes(suit) ? suit : mostCommonSuit(me.hand);
  } else {
    s.activeSuit = card.suit;
  }

  const next = nextActiveIndex(s, player);
  const nextName = s.players[next].name;
  const prevPending = s.pending;

  if (me.hand.length === 0) {
    s.message = `${me.name} played ${cardLabel(card)} and went out!`;
    // Going out on a 2 or an Ace penalty: the next player must still take it before scoring,
    // with no chance to answer.
    let penalty = 0;
    if (card.rank === '2') {
      penalty = (prevPending?.type === 'draw2' ? prevPending.amount : 0) + TWO_PENALTY;
    } else if (isAceOfSpades(card) || (card.rank === 'A' && prevPending?.type === 'ace')) {
      penalty = ACE_PENALTY;
    }
    if (penalty > 0 && next !== player) {
      const got = drawCards(s, next, penalty);
      s.message += ` ${nextName} still takes +${got}.`;
    }
    return endRound(s, player, 'out');
  }

  if (card.rank === '2') {
    const amount = (prevPending?.type === 'draw2' ? prevPending.amount : 0) + TWO_PENALTY;
    s.pending = { type: 'draw2', amount };
    s.message = `${me.name} played ${cardLabel(card)}: ${nextName} must answer or take +${amount}`;
  } else if (isAceOfSpades(card) || (card.rank === 'A' && prevPending?.type === 'ace')) {
    s.pending = { type: 'ace', amount: ACE_PENALTY };
    s.message = `${me.name} played ${cardLabel(card)}: ${nextName} must answer with an Ace or take +${ACE_PENALTY}`;
  } else if (card.rank === '8') {
    s.pending = { type: 'skip' };
    s.message = `${me.name} played ${cardLabel(card)}: ${nextName} is skipped unless they have an 8`;
  } else if (card.rank === 'J') {
    s.pending = null;
    s.message = `${me.name} played ${cardLabel(card)} and called ${SUIT_NAME[s.activeSuit]}`;
  } else {
    s.pending = null;
    s.message = `${me.name} played ${cardLabel(card)}`;
  }

  s.current = next;
  return s;
}

function draw(state, { player }) {
  if (!isTurnOf(state, player)) return state;
  if (state.pending?.type === 'skip') return state; // must accept the skip, not draw

  const s = cloneState(state);
  const me = s.players[player];
  const wanted = s.pending ? s.pending.amount : 1;
  const got = drawCards(s, player, wanted);

  if (s.pending) {
    s.message = `${me.name} took the +${wanted} penalty${got < wanted ? ` (only ${got} left)` : ''}`;
  } else {
    s.message = got ? `${me.name} drew a card` : `${me.name} passed: no cards left to draw`;
  }
  s.pending = null;
  s.lastEvent = { kind: 'draw', player, count: got, at: Date.now() };

  // Edge case: every active player passes with nothing left to draw. End the round,
  // and the player with the fewest hand points takes it.
  s.emptyPasses = got === 0 ? s.emptyPasses + 1 : 0;
  const active = s.players.map((p, i) => i).filter((i) => !s.players[i].eliminated);
  if (s.emptyPasses >= active.length) {
    const best = active.reduce((b, i) =>
      handPoints(s.players[i].hand) < handPoints(s.players[b].hand) ? i : b
    );
    s.message = 'The deck ran dry: lowest hand takes the round';
    return endRound(s, best, 'stalemate');
  }

  s.current = nextActiveIndex(s, player);
  return s;
}

function acceptSkip(state, { player }) {
  if (!isTurnOf(state, player) || state.pending?.type !== 'skip') return state;
  const s = cloneState(state);
  s.pending = null;
  s.message = `${s.players[player].name} was skipped`;
  s.lastEvent = { kind: 'skip', player, at: Date.now() };
  s.current = nextActiveIndex(s, player);
  return s;
}
