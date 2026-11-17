import { renderPage, safe, DATA, SITE, esc, faqLd, crumbsLd, storeLd } from '../seo-lib/render.js';

export const onRequestGet = safe(async (context) => renderPage(context, {
  title: 'FAQ: Ordering Alcohol Online in KL & Klang Valley | Masterliqours',
  description: 'How liquor delivery works at Masterliqours: delivery areas, same-day delivery, payment by WhatsApp, free delivery over RM1,250, ML10 first-order code, 21+ rules.',
  path: '/faq',
  jsonld: [faqLd(), storeLd(), crumbsLd([['Home', SITE + '/'], ['FAQ', SITE + '/faq']])],
  body: `<h1>Frequently asked questions</h1>${DATA.faq.map((f) => `<h2>${esc(f.q)}</h2><p>${esc(f.a)}</p>`).join('')}`,
}));
