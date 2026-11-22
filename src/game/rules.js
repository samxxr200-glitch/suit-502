// Pure rule checks for 502. No state is changed here.

export const ELIMINATION_SCORE = 502;
export const HAND_SIZE = 7;
export const TWO_PENALTY = 2; // each 2 adds 2 to the stack (2, 4, 6, 8)
export const ACE_PENALTY = 5; // Ace of Spades: draw 5, never grows

export const isSevenOfHearts = (c) => c.rank === '7' && c.suit === 'H';
export const isAceOfSpades = (c) => c.rank === 'A' && c.suit === 'S';

/** Penalty points for a card left in hand at the end of a round. */
export function cardPoints(card) {
  if (isSevenOfHearts(card) || isAceOfSpades(card)) return 100;
  if (card.rank === '2' || card.rank === '8' || card.rank === 'J') return 30;
  if (card.rank === 'A') return 20; // Ace of Hearts / Diamonds / Clubs
  if (card.rank === '10' || card.rank === 'Q' || card.rank === 'K') return 10;
  return 5; // 3-6, 9 and the other 7s
}

export const handPoints = (hand) => hand.reduce((sum, c) => sum + cardPoints(c), 0);

/** The first face-up card cannot be a 2, Jack, Ace or the 7 of Hearts. */
export const isValidStartCard = (c) =>
  c.rank !== '2' && c.rank !== 'J' && c.rank !== 'A' && !isSevenOfHearts(c);

/**
 * Can `card` be played right now?
 * @param pending null | { type: 'draw2' | 'ace' | 'skip', amount?: number }
 */
export function canPlayCard(card, topCard, activeSuit, pending) {
  // 7 of Hearts is wild and ends the round instantly — always playable.
  if (isSevenOfHearts(card)) return true;

  if (pending) {
    if (pending.type === 'draw2') return card.rank === '2'; // answer a 2 with a 2
    if (pending.type === 'ace') return card.rank === 'A'; // pass the 5 on with any Ace
    if (pending.type === 'skip') return card.rank === '8'; // pass the skip on with an 8
  }

  if (card.rank === 'J') return true; // Jack is wild
  return card.suit === activeSuit || card.rank === topCard.rank;
}

/** Text explaining why a card was rejected (shown to the player). */
export function whyNotPlayable(card, topCard, activeSuit, pending, suitName) {
  if (pending?.type === 'draw2') return `A 2 is stacked on you: play a 2 or take +${pending.amount}.`;
  if (pending?.type === 'ace') return `Ace of Spades: play any Ace or take +${pending.amount}.`;
  if (pending?.type === 'skip') return 'You are being skipped: play an 8 or accept the skip.';
  return `Match ${suitName[activeSuit]} or a ${topCard.rank}, play a Jack, or draw.`;
}
