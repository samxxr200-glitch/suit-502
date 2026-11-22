// Computer opponent. Returns the action a bot wants to take; the reducer applies it.

import { SUITS } from './deck.js';
import { canPlayCard, cardPoints, isSevenOfHearts } from './rules.js';
import { gameReducer, topCard } from './engine.js';

function bestSuitFor(hand) {
  const counts = { S: 0, H: 0, D: 0, C: 0 };
  hand.forEach((c) => {
    if (c.rank !== 'J') counts[c.suit] += 1 + cardPoints(c) / 100;
  });
  return SUITS.reduce((best, s) => (counts[s] > counts[best] ? s : best), 'S');
}

export function chooseMove(state, playerIndex) {
  const me = state.players[playerIndex];
  const top = topCard(state);
  const playable = me.hand.filter((c) => canPlayCard(c, top, state.activeSuit, state.pending));
  const play = (card) => {
    const rest = me.hand.filter((c) => c.id !== card.id);
    return { type: 'PLAY', player: playerIndex, cardId: card.id, suit: card.rank === 'J' ? bestSuitFor(rest) : undefined };
  };

  // Use the 7♥ when it really matters: a rival is close to going out, a big penalty is coming, or we're nearly done.
  const seven = playable.find(isSevenOfHearts);
  if (seven) {
    const rivalClose = state.players.some((p, i) => i !== playerIndex && !p.eliminated && p.hand.length <= 1);
    const bigPenalty = (state.pending?.amount ?? 0) >= 6;
    if (rivalClose || bigPenalty || me.hand.length <= 2) return play(seven);
  }

  const normal = playable.filter((c) => !isSevenOfHearts(c));

  if (state.pending) {
    if (normal.length) return play(normal[0]);
    if (seven) return play(seven);
    return state.pending.type === 'skip'
      ? { type: 'ACCEPT_SKIP', player: playerIndex }
      : { type: 'DRAW', player: playerIndex };
  }

  if (normal.length) {
    // Keep Jacks as a fallback; otherwise dump the most expensive card first.
    const nonJacks = normal.filter((c) => c.rank !== 'J');
    const pool = nonJacks.length ? nonJacks : normal;
    const ranked = [...pool].sort((a, b) => cardPoints(b) - cardPoints(a));
    return play(ranked[0]);
  }
  if (seven) return play(seven);
  return { type: 'DRAW', player: playerIndex };
}

/** Lets bots play out the rest of the game instantly (used after the human is eliminated). */
export function playOutGame(state, maxSteps = 100000) {
  let s = state;
  for (let i = 0; i < maxSteps && s.phase !== 'gameOver'; i++) {
    s = s.phase === 'roundOver' ? gameReducer(s, { type: 'NEXT_ROUND' }) : gameReducer(s, chooseMove(s, s.current));
  }
  return s;
}
