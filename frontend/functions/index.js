import { renderPage, safe, api, DATA, SITE, esc, storeLd, websiteLd, faqLd, itemListLd, productCards } from '../seo-lib/render.js';

export const onRequestGet = safe(async (context) => {
  const avail = await api('/products?limit=24&page=1&available_only=true').catch(() => ({ products: [] }));
  const list = avail.products || [];
  const body = `
<h1>Alcohol delivery in KL &amp; Klang Valley: Masterliqours</h1>
<p>${esc(DATA.summary)}</p>
<ul>${DATA.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<h2>Shop by category</h2>
<ul>${DATA.categories.map((c) => `<li><a href="/products?category=${encodeURIComponent(c)}">${esc(c === 'Whiskey' ? 'Whisky' : c)}</a>: ${esc(DATA.categoryCopy[c] || '')}</li>`).join('')}</ul>
${list.length ? `<h2>Available now for same-day delivery</h2>${productCards(list)}<p><a href="/products?available=1">See every in-stock bottle</a></p>` : ''}
<h2>Delivery areas</h2>
<ul>${DATA.areas.map((a) => `<li><a href="/delivery/${a.slug}">Alcohol delivery in ${esc(a.name)}</a></li>`).join('')}</ul>
<h2>Frequently asked questions</h2>
${DATA.faq.slice(0, 6).map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
<p><a href="/faq">More questions</a></p>`;
  return renderPage(context, {
    title: 'Alcohol Delivery KL & Klang Valley | Same-Day Liquor Delivery – Masterliqours',
    description: 'Order whisky, cognac, wine, champagne, gin & vodka online. 500+ bottles, same-day delivery across KL, PJ, Shah Alam, Subang & the Klang Valley. Free delivery over RM1,250. 21+ only.',
    path: '/',
    jsonld: [storeLd(), websiteLd(), faqLd(DATA.faq.slice(0, 6)), list.length ? itemListLd(list, 'Available now') : null],
    body,
  });
});
