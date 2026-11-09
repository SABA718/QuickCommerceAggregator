import { describe, expect, it } from 'vitest';
import { availableOffers, normalizeRecipe } from './cartModel';

describe('live recipe comparison', () => {
  it('never supplies sample prices when no offers exist', () => {
    expect(normalizeRecipe({ winner: null, runnerUps: [] }).winnerItems).toEqual([]);
  });
  it('compares matching pack sizes and chooses actual cheapest variant at each store', () => {
    const { winnerItems } = normalizeRecipe({
      winner: { platform: 'Zepto', totalPrice: 45, items: [{ originalQuery: 'Milk', variants: [
        { name: 'Milk 500ml', quantity: '500ml', price: 25 },
        { name: 'Milk 1L', quantity: '1L', price: 45 },
        { name: 'Premium Milk 1L', quantity: '1L', price: 55 },
      ] }] },
      runnerUps: [{ platform: 'Blinkit', totalPrice: 47, items: [{ originalQuery: 'milk', variants: [
        { name: 'Milk 1L', quantity: '1L', price: 47 },
        { name: 'Bad offer', quantity: '1L', price: 0 },
      ] }] }],
    });
    expect(winnerItems).toHaveLength(1);
    expect(availableOffers(winnerItems[0], '1L').map(offer => offer.price)).toEqual([45, 47]);
    expect(availableOffers(winnerItems[0], '500ml').map(offer => offer.price)).toEqual([25]);
    expect(availableOffers(winnerItems[0], '2L')).toEqual([]);
  });
});
