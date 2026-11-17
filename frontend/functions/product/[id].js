import { renderPage, safe, api, DATA, SITE, esc, prettyName, parseSpecs, productDescription, productLd, crumbsLd, productCards, brandOf } from '../../seo-lib/render.js';

export const onRequestGet = safe(async (context) => {
  const id = String(context.params.id || '');
  let p;
  try { p = await api('/products/' + encodeURIComponent(id)); } catch (e) { p = null; }
  if (!p || !p.product_id) {
    return renderPage(context, { title: 'Bottle not found | Masterliqours', description: 'This bottle is no longer listed. Browse 500+ bottles with same-day delivery in KL & Klang Valley.', path: '/products', status: 404, noindex: true, body: '<h1>Bottle not found</h1><p><a href="/products">Browse all bottles</a></p>' });
  }
  const name = prettyName(p.name);
  const { abv, size } = parseSpecs(p.name);
  const catWord = p.category === 'Whiskey' ? 'Whisky' : p.category;
  const related = await api(`/products?limit=12&page=1&category=${encodeURIComponent(p.category)}&sort=random`).then((r) => (r.products || []).filter((x) => x.product_id !== p.product_id).slice(0, 8)).catch(() => []);
  const sale = p.original_price && p.original_price > p.price;
  const body = `
<nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/products?category=${encodeURIComponent(p.category)}">${esc(catWord)}</a> › ${esc(name)}</nav>
<h1>${esc(name)}</h1>
${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(name)} bottle" width="320" height="320" style="max-width:320px;height:auto" />` : ''}
<p><strong>Price: RM${Number(p.price).toFixed(2)}</strong>${sale ? ` (was RM${Number(p.original_price).toFixed(2)}, ${Math.round((1 - p.price / p.original_price) * 100)}% off)` : ''}</p>
<p>${p.is_preorder ? 'Pre-order: sourced after you order, so it takes longer than same-day.' : 'In stock: same-day delivery across KL &amp; Klang Valley.'}</p>
<ul><li>Category: ${esc(catWord)}</li><li>Brand: ${esc(brandOf(name))}</li>${size ? `<li>Size: ${esc(size)}</li>` : ''}${abv ? `<li>Alcohol: ${esc(abv)} ABV</li>` : ''}</ul>
<p>${esc(productDescription(p))}</p>
<p>How to order: add ${esc(name)} to your cart, check out, and confirm payment over WhatsApp. Free delivery on orders above RM1,250; first-time customers get 10% off with code ML10. 21+ only.</p>
${related.length ? `<h2>More ${esc(catWord.toLowerCase())}</h2>${productCards(related)}` : ''}`;
  return renderPage(context, {
    title: `${name}: Price RM${Math.round(p.price)} | Buy ${catWord} Online KL – Masterliqours`,
    description: productDescription(p),
    path: `/product/${p.product_id}`,
    image: p.image_url,
    jsonld: [productLd(p), crumbsLd([['Home', SITE + '/'], [catWord, `${SITE}/products?category=${encodeURIComponent(p.category)}`], [name, `${SITE}/product/${p.product_id}`]])],
    body,
  });
});
