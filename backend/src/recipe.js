const { PLATFORMS } = require('./scraperEngine');

/** @param {{ingredient:string,results:import('./database').Product[]}[]} allScrapedData */
function buildLiveCart(allScrapedData) {
  const carts = PLATFORMS.map(platform => {
    const items = allScrapedData.flatMap(({ ingredient, results }) => {
      const matches = results.filter(row => row.platform === platform && Number.isFinite(row.price) && row.price > 0)
        .sort((a, b) => a.price - b.price);
      if (!matches.length) return [];
      const variants = matches.map(row => ({
        name: row.name, price: row.price, quantity: row.quantity, link: row.link,
      }));
      return [{ originalQuery: ingredient, image_url: matches[0].image_url, time: matches[0].time,
        variants, selectedVariant: variants[0] }];
    });
    return { platform, totalPrice: Math.round(items.reduce((sum, item) => sum + item.selectedVariant.price, 0) * 100) / 100,
      deliveryTime: items[0]?.time || '', items, itemsFound: items.length,
      missingItems: allScrapedData.filter(row => !items.some(item => item.originalQuery === row.ingredient)).map(row => row.ingredient),
      isComplete: items.length === allScrapedData.length && allScrapedData.length > 0 };
  }).filter(cart => cart.itemsFound > 0);
  carts.sort((a, b) => b.itemsFound - a.itemsFound || a.totalPrice - b.totalPrice);
  return { winner: carts[0] || null, runnerUps: carts.slice(1), itemsRequested: allScrapedData.length };
}

module.exports = { buildLiveCart };
