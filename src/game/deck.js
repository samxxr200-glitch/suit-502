// Card + deck helpers. A card is a plain object: { id: 'QH', rank: 'Q', suit: 'H' }

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };

export const isRedSuit = (suit) => suit === 'H' || suit === 'D';

export const cardLabel = (card) => `${card.rank}${SUIT_SYMBOL[card.suit]}`;

/** A fresh, ordered 52-card deck (no jokers). */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, rank, suit });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle. Returns a NEW array; the input is not mutated. */
export function shuffle(cards, rng = Math.random) {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
