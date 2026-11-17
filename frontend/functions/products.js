import { renderPage, safe, api, allProducts, DATA, SITE, esc, crumbsLd, itemListLd, productCards, storeLd } from '../seo-lib/render.js';

export const onRequestGet = safe(async (context) => {
  const u = new URL(context.request.url);
  const catParam = u.searchParams.get('category') || '';
  const cat = DATA.categories.find((c) => c.toLowerCase() === catParam.toLowerCase()) || '';
  const search = u.searchParams.get('search') || '';
  const availOnly = u.searchParams.get('available') === '1';
  let list = await allProducts();
  if (cat) list = list.filter((p) => p.category === cat);
  if (availOnly) list = list.filter((p) => !p.is_preorder);
  if (search) { const q = search.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q)); }
  const inStock = list.filter((p) => !p.is_preorder);
  const ordered = [...inStock, ...list.filter((p) => p.is_preorder)];
  const word = cat ? (cat === 'Whiskey' ? 'Whisky' : cat) : (availOnly ? 'In-Stock Alcohol' : 'Alcohol');
  const path = cat ? `/products?category=${encodeURIComponent(cat)}` : availOnly ? '/products?available=1' : '/products';
  const prices = list.map((p) => p.price).filter((x) => x > 0);
  const range = prices.length ? `RM${Math.round(Math.min(...prices))} to RM${Math.round(Math.max(...prices)).toLocaleString('en-MY')}` : '';
  const body = `
<h1>Buy ${esc(word)} online in Malaysia: same-day delivery in KL &amp; Klang Valley</h1>
<p>${esc(cat ? DATA.categoryCopy[cat] : DATA.summary)}</p>
<p>${list.length} bottles${range ? `, priced ${range}` : ''}. ${inStock.length} in stock for same-day delivery; the rest can be pre-ordered.</p>
${productCards(ordered)}`;
  return renderPage(context, {
    title: cat ? `Buy ${word} Online Malaysia | ${word} Delivery KL – Masterliqours` : availOnly ? 'In-Stock Alcohol, Same-Day Delivery KL | Masterliqours' : 'Shop 500+ Bottles Online | Liquor Delivery KL & Klang Valley – Masterliqours',
    description: `${list.length} ${word.toLowerCase()} bottles${range ? ` from ${range}` : ''}. Order online for same-day delivery across KL, PJ, Shah Alam, Subang & the Klang Valley. Free delivery over RM1,250. 21+ only.`,
    path,
    noindex: !!search,
    jsonld: [storeLd(), crumbsLd([['Home', SITE + '/'], ['Shop', SITE + '/products'], ...(cat ? [[word, SITE + path]] : [])]), itemListLd(ordered, `${word} at Masterliqours`)],
    body,
  });
});
