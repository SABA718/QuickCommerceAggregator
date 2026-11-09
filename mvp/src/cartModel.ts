import { safeProductUrl, type RecipeCart } from './api';
export interface Offer { platform: string; price: number; quantity: string; url?: string; name: string }
export interface Ingredient { originalQuery: string; image_url: string; quantityOptions: string[]; options: Offer[] }
export function normalizeRecipe(data: RecipeCart): { winnerItems: Ingredient[]; itemsRequested: number } {
  const grouped = new Map<string, Ingredient>();
  for (const cart of [data.winner, ...(data.runnerUps || [])]) {
    if (!cart || !Array.isArray(cart.items)) continue;
    for (const item of cart.items) {
      if (!item.originalQuery) continue;
      const key = item.originalQuery.trim().toLowerCase();
      const row = grouped.get(key) || { originalQuery: item.originalQuery, image_url: item.image_url || '', quantityOptions: [], options: [] };
      for (const variant of item.variants || []) {
        if (!Number.isFinite(variant.price) || variant.price <= 0) continue;
        const quantity = variant.quantity || 'Pack size unavailable';
        row.options.push({ platform: cart.platform, price: variant.price, quantity, name: variant.name, url: safeProductUrl(variant.link) });
        if (!row.quantityOptions.includes(quantity)) row.quantityOptions.push(quantity);
      }
      grouped.set(key, row);
    }
  }
  return { winnerItems: [...grouped.values()], itemsRequested: data.itemsRequested ?? grouped.size };
}
export function availableOffers(item: Ingredient, quantity: string): Offer[] {
  const cheapest = new Map<string, Offer>();
  for (const offer of item.options.filter(option => option.quantity === quantity)) {
    const current = cheapest.get(offer.platform);
    if (!current || offer.price < current.price) cheapest.set(offer.platform, offer);
  }
  return [...cheapest.values()].sort((a, b) => a.price - b.price);
}
