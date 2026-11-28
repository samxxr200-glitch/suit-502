// Headless stress test for the game engine: plays many bot-only games and checks invariants.
// Run: npm run simulate
import { createGame, gameReducer, topCard } from '../src/game/engine.js';
import { chooseMove } from '../src/game/ai.js';
import { canPlayCard, ELIMINATION_SCORE } from '../src/game/rules.js';

const GAMES = Number(process.argv[2] ?? 500);
let rounds = 0;
let sevens = 0;

function assert(cond, msg, s) {
  if (!cond) {
    console.error('INVARIANT FAILED:', msg);
    console.error(JSON.stringify({ round: s.round, current: s.current, pending: s.pending, phase: s.phase }, null, 1));
    process.exit(1);
  }
}

function checkCards(s) {
  const total = s.drawPile.length + s.discardPile.length + s.players.reduce((n, p) => n + p.hand.length, 0);
  assert(total === 52, `card count is ${total}`, s);
  const ids = new Set([...s.drawPile, ...s.discardPile, ...s.players.flatMap((p) => p.hand)].map((c) => c.id));
  assert(ids.size === 52, 'duplicate cards', s);
}

for (let g = 0; g < GAMES; g++) {
  let s = createGame({ humanName: 'Bot0', botCount: 1 + (g % 5) });
  checkCards(s);
  let steps = 0;
  while (s.phase !== 'gameOver') {
    assert(++steps < 200000, 'game did not finish', s);
    if (s.phase === 'roundOver') {
      rounds++;
      if (s.roundResult.reason === 'seven') sevens++;
      s = gameReducer(s, { type: 'NEXT_ROUND' });
      checkCards(s);
      const first = topCard(s);
      assert(!['2', 'J', 'A'].includes(first.rank) && first.id !== '7H', 'illegal start card ' + first.id, s);
      continue;
    }
    const move = chooseMove(s, s.current);
    if (move.type === 'PLAY') {
      const card = s.players[s.current].hand.find((c) => c.id === move.cardId);
      assert(canPlayCard(card, topCard(s), s.activeSuit, s.pending), 'bot chose illegal card', s);
    }
    const next = gameReducer(s, move);
    assert(next !== s, `move rejected: ${JSON.stringify(move)}`, s);
    s = next;
    checkCards(s);
  }
  const alive = s.players.filter((p) => !p.eliminated);
  assert(alive.length <= 1, 'game over with several players alive', s);
  assert(s.championIndex !== null, 'no champion', s);
  s.players.forEach((p) => assert(p.eliminated === p.score >= ELIMINATION_SCORE || !p.eliminated, 'bad elimination', s));
}

// Rule spot-checks against hand-built states
const base = createGame({ botCount: 1 });
const mk = (over) => ({ ...base, ...over, players: base.players.map((p, i) => ({ ...p, hand: over.hands[i] })) });
const C = (id) => ({ id, rank: id.slice(0, -1), suit: id.slice(-1) });

// 2 stacks: 2 then 2 → pending 4
let t = mk({ hands: [[C('2H'), C('5C')], [C('2S'), C('9D')]], discardPile: [C('6H')], activeSuit: 'H', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: '2H' });
t = gameReducer(t, { type: 'PLAY', player: 1, cardId: '2S' });
assert(t.pending?.type === 'draw2' && t.pending.amount === 4, 'twos should stack to 4', t);
const before = t.players[0].hand.length;
t = gameReducer(t, { type: 'DRAW', player: 0 });
assert(t.players[0].hand.length === before + 4 && t.current === 1, 'take +4 then turn passes', t);

// Ace of Spades: next draws 5 unless Ace; passing keeps 5
t = mk({ hands: [[C('AS'), C('5C')], [C('AH'), C('9D')]], discardPile: [C('6S')], activeSuit: 'S', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: 'AS' });
t = gameReducer(t, { type: 'PLAY', player: 1, cardId: 'AH' });
assert(t.pending?.type === 'ace' && t.pending.amount === 5, 'ace pass keeps 5', t);

// 8 skip: with 2 players the 8 player goes again after skip
t = mk({ hands: [[C('8H'), C('5C')], [C('3D'), C('9D')]], discardPile: [C('6H')], activeSuit: 'H', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: '8H' });
assert(gameReducer(t, { type: 'PLAY', player: 1, cardId: '3D' }) === t, 'cannot play non-8 on skip', t);
t = gameReducer(t, { type: 'ACCEPT_SKIP', player: 1 });
assert(t.current === 0, 'skipped player loses turn', t);

// Jack names suit; 7♥ ends round instantly and scores
t = mk({ hands: [[C('JC'), C('5C')], [C('7H'), C('AS'), C('KD')]], discardPile: [C('6H')], activeSuit: 'H', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: 'JC', suit: 'D' });
assert(t.activeSuit === 'D', 'jack sets suit', t);
t = gameReducer(t, { type: 'PLAY', player: 1, cardId: '7H' });
assert(t.phase === 'roundOver' && t.roundResult.winnerIndex === 1, '7H wins round', t);
assert(t.players[0].score === 5 && t.players[1].score === 110, '5C = 5 pts; 7H winner still scores A♠ + K♦ = 110', t);
// Fewest points last round starts next, even if they did not win it
t = gameReducer(t, { type: 'NEXT_ROUND' });
assert(t.current === 0, 'player with fewest round points starts next round', t);

// Going out on a 2: the next player still takes +2 before scoring
t = mk({ hands: [[C('2H')], [C('9D')]], discardPile: [C('6H')], activeSuit: 'H', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: '2H' });
assert(t.phase === 'roundOver' && t.players[1].hand.length === 3, 'last-card 2 still gives +2', t);
t = gameReducer(t, { type: 'NEXT_ROUND' });
assert(t.current === 0, 'player who went out (0 pts) starts next round', t);

// Going out on A♠: the next player still takes +5
t = mk({ hands: [[C('AS')], [C('9D')]], discardPile: [C('6S')], activeSuit: 'S', current: 0, pending: null });
t = gameReducer(t, { type: 'PLAY', player: 0, cardId: 'AS' });
assert(t.phase === 'roundOver' && t.players[1].hand.length === 6, 'last-card A♠ still gives +5', t);

// Not your turn → ignored
assert(gameReducer(base, { type: 'DRAW', player: 1 }) === base, 'out-of-turn draw ignored', base);

console.log(`OK: ${GAMES} games, ${rounds} rounds (${sevens} ended by 7♥), all invariants and rule checks passed.`);
