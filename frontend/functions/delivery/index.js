import { renderPage, safe, DATA, SITE, esc, storeLd, crumbsLd } from '../../seo-lib/render.js';

export const onRequestGet = safe(async (context) => renderPage(context, {
  title: 'Alcohol Delivery Areas: KL, PJ, Shah Alam, Subang & Klang Valley | Masterliqours',
  description: 'Masterliqours delivers whisky, cognac, wine & spirits same-day across Kuala Lumpur and the Klang Valley: PJ, Shah Alam, Subang Jaya, Klang, Puchong, Cheras, Ampang, Kajang, Cyberjaya.',
  path: '/delivery',
  jsonld: [storeLd(), crumbsLd([['Home', SITE + '/'], ['Delivery areas', SITE + '/delivery']])],
  body: `<h1>Where we deliver alcohol in the Klang Valley</h1><p>${esc(DATA.summary)}</p>
<ul>${DATA.areas.map((a) => `<li><a href="/delivery/${a.slug}">${esc(a.name)}</a>: ${esc(a.neighbourhoods.slice(0, 6).join(', '))}</li>`).join('')}</ul>`,
}));
