import { renderPage, safe, api, DATA, SITE, esc, storeLd, crumbsLd, faqLd, productCards } from '../../seo-lib/render.js';

export const onRequestGet = safe(async (context) => {
  const a = DATA.areas.find((x) => x.slug === String(context.params.area || '').toLowerCase());
  if (!a) return renderPage(context, { title: 'Delivery area not found | Masterliqours', description: 'See every area we deliver alcohol to in KL & Klang Valley.', path: '/delivery', status: 404, noindex: true, body: '<h1>Area not found</h1><p><a href="/delivery">All delivery areas</a></p>' });
  const avail = await api('/products?limit=12&page=1&available_only=true&sort=random').catch(() => ({ products: [] }));
  const faqs = [
    { q: `Do you deliver alcohol to ${a.name}?`, a: `Yes. Masterliqours delivers whisky, cognac, wine, champagne and spirits to ${a.name}, including ${a.neighbourhoods.slice(0, 5).join(', ')}. Order at masterliqours.my.` },
    { q: `Is same-day alcohol delivery available in ${a.name}?`, a: `Yes, in-stock bottles are delivered the same day across ${a.name} (times are estimates). ${a.notes}` },
    { q: `How much is alcohol delivery to ${a.name}?`, a: 'Delivery is free on orders above RM1,250. For smaller orders the fee is shown at checkout.' },
    DATA.faq.find((f) => f.q.startsWith('How old')),
  ];
  const others = DATA.areas.filter((x) => x.slug !== a.slug);
  return renderPage(context, {
    title: `Alcohol Delivery ${a.name} | Same-Day Liquor Delivery ${a.short} – Masterliqours`,
    description: `${a.intro} Free delivery over RM1,250. 21+ only.`.slice(0, 300),
    path: `/delivery/${a.slug}`,
    jsonld: [storeLd(), crumbsLd([['Home', SITE + '/'], ['Delivery areas', SITE + '/delivery'], [a.name, `${SITE}/delivery/${a.slug}`]]), faqLd(faqs)],
    body: `<h1>Alcohol delivery in ${esc(a.name)}</h1>
<p>${esc(a.intro)}</p><p>${esc(a.notes)}</p>
<h2>Areas covered in ${esc(a.name)}</h2><p>${esc(a.neighbourhoods.join(', '))}.</p>
<h2>What you can order</h2><ul>${DATA.categories.map((c) => `<li><a href="/products?category=${encodeURIComponent(c)}">${esc(c === 'Whiskey' ? 'Whisky' : c)}</a></li>`).join('')}</ul>
${(avail.products || []).length ? `<h2>In stock now for ${esc(a.short)}</h2>${productCards(avail.products)}` : ''}
<h2>Questions</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
<h2>Other areas</h2><p>${others.map((x) => `<a href="/delivery/${x.slug}">${esc(x.name)}</a>`).join(' · ')}</p>`,
  });
});
