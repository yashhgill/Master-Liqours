import { DATA, SITE, allProducts, prettyName } from '../seo-lib/render.js';

/* Full live catalogue for AI assistants: every bottle, price and stock status. */
export async function onRequestGet() {
  let products = [];
  try { products = await allProducts(); } catch (e) {}
  const by = {};
  products.forEach((p) => { (by[p.category] = by[p.category] || []).push(p); });
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const sections = DATA.categories.filter((c) => by[c]).map((c) => `## ${c === 'Whiskey' ? 'Whisky' : c} (${by[c].length})\n` + by[c].sort((a, b) => a.is_preorder - b.is_preorder || a.name.localeCompare(b.name)).map((p) => `- [${prettyName(p.name)}](${SITE}/product/${p.product_id}): RM${Number(p.price).toFixed(2)}${p.original_price && p.original_price > p.price ? ` (was RM${Number(p.original_price).toFixed(2)})` : ''}, ${p.is_preorder ? 'pre-order' : 'in stock, same-day delivery'}`).join('\n')).join('\n\n');
  const t = `# ${DATA.name}: full catalogue\n\n> ${DATA.summary}\n\nPrices in Malaysian Ringgit, generated live at ${now} UTC. ${products.length} bottles. Order at ${SITE}.\n\n${sections}\n`;
  return new Response(t, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
