/*
 * Server-side SEO for Masterliqours (runs in Cloudflare Pages Functions).
 *
 * The site is a React single-page app, so every URL ships the same empty
 * <div id="root">. Google can run the JavaScript, but most AI crawlers
 * (ChatGPT, Claude, Perplexity) and link previews cannot, so they used to see
 * nothing. These helpers take the normal index.html and, for each page, fill in:
 *   - the right <title>, description, canonical URL and social tags
 *   - schema.org JSON-LD (store, products, FAQ, breadcrumbs)
 *   - real readable HTML inside #root (React replaces it as soon as it loads)
 */
import DATA from '../src/seo/seo-data.json';

export const SITE = DATA.site;
export const API = 'https://master-liqours-sg.onrender.com/api';
export { DATA };

/* ---------- small utils ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const rm = (n) => 'RM' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ABBR = { JW: 'Johnnie Walker', JD: "Jack Daniel's" };
const KEEP = new Set(['XO', 'VS', 'VSOP', 'XXO', 'XR', 'NV', 'II', 'III', 'IV', 'USA', 'UK', 'IPA', 'DSS', 'NAS', 'PX', 'ABV', 'BBQ', 'NO.']);
const FIX = { DEWARS: "Dewar's", HENDRICKS: "Hendrick's", DANIELS: "Daniel's", MOET: 'Moët', JAGERMEISTER: 'Jägermeister', BAILEYS: "Baileys", "CHIVAS'S": "Chivas's" };

/** "JW BLUE LABEL 40% 750ML" -> "Johnnie Walker Blue Label 40% 750ml" */
export function prettyName(raw) {
  return String(raw || '').trim().split(/\s+/).map((w) => {
    const u = w.toUpperCase();
    if (ABBR[u]) return ABBR[u];
    if (FIX[u]) return FIX[u];
    if (KEEP.has(u)) return u;
    if (/^\d+(\.\d+)?(ML|CL)$/i.test(w)) return w.toLowerCase();
    if (/^\d+(\.\d+)?L$/i.test(w)) return w.slice(0, -1) + 'L';
    if (/^\d+Y(O|RS?)?$/i.test(w)) return w.replace(/Y.*$/i, '') + ' Year';
    if (/\d/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ').replace(/\s+/g, ' ');
}

export function parseSpecs(raw) {
  const s = String(raw || '');
  const abv = (s.match(/(\d+(?:\.\d+)?)\s*%/) || [])[1];
  const m = s.match(/(\d+(?:\.\d+)?)\s*(ML|CL|L)\b/i);
  let size = null;
  if (m) {
    const n = parseFloat(m[1]); const u = m[2].toUpperCase();
    size = u === 'ML' ? `${n}ml` : u === 'CL' ? `${n}cl` : `${n}L`;
  }
  return { abv: abv ? `${abv}%` : null, size };
}

const BRANDS = ["Johnnie Walker", "Chivas", "Glenfiddich", "Glenlivet", "Singleton", "Dalmore", "Jameson", "Jack Daniel's", "Suntory", "Hibiki", "Yamazaki", "Hakushu", "Hennessy", "Martell", "Courvoisier", "Moët", "Hendrick's", "Bombay", "Tanqueray", "Monkey 47", "Absolut", "Grey Goose", "Belvedere", "Smirnoff", "Bacardi", "Captain Morgan", "Patron", "Don Julio", "Baileys", "Jägermeister", "Kahlua", "Dewar's", "Ballantine's", "Royal Salute", "Monkey Shoulder", "Macallan", "Glenmorangie", "Talisker", "Lagavulin", "Laphroaig", "Ardbeg", "Mortlach", "Jim Beam", "Maker's Mark", "Camus", "Remy Martin", "Glenfarclas", "Balvenie", "Highland Park", "Aberlour", "Old Parr", "Buchanan's"];
export function brandOf(pretty) {
  const p = pretty.toLowerCase().replace(/[’']/g, '');
  return BRANDS.find((b) => p.startsWith(b.toLowerCase().replace(/[’']/g, ''))) || BRANDS.find((b) => p.includes(b.toLowerCase().replace(/[’']/g, ''))) || pretty.split(' ')[0];
}

const catWord = (c) => (c === 'Whiskey' ? 'whisky' : String(c || 'liquor').toLowerCase());

export function productUrl(p) { return `${SITE}/product/${p.product_id}`; }

/** Honest, fact-only description when the shop hasn't written one. */
export function productDescription(p) {
  const name = prettyName(p.name);
  const { abv, size } = parseSpecs(p.name);
  const own = (p.description || '').replace(/\s+/g, ' ').trim();
  const spec = [size, abv ? `${abv} ABV` : null].filter(Boolean).join(', ');
  const avail = p.is_preorder ? 'Available to pre-order' : 'In stock for same-day delivery';
  const price = p.original_price && p.original_price > p.price ? `${rm(p.price)} (was ${rm(p.original_price)})` : rm(p.price);
  const base = `Buy ${name}${spec ? ` (${spec})` : ''} online in Malaysia for ${price}. ${avail} across Kuala Lumpur and the Klang Valley from Masterliqours.`;
  return own ? `${own} ${base}` : base;
}

/* ---------- data fetch (cached at Cloudflare's edge for 10 minutes) ---------- */
export async function api(path) {
  const r = await fetch(API + path, { cf: { cacheTtl: 600, cacheEverything: true }, headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`API ${path} ${r.status}`);
  return r.json();
}

export async function allProducts() {
  const first = await api('/products?limit=200&page=1');
  let list = first.products || [];
  const pages = Math.min(first.pages || 1, 10);
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => api(`/products?limit=200&page=${i + 2}`).catch(() => ({ products: [] }))));
  rest.forEach((r) => { list = list.concat(r.products || []); });
  return list;
}

/* ---------- JSON-LD builders ---------- */
export function storeLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LiquorStore',
    '@id': `${SITE}/#store`,
    name: DATA.name,
    alternateName: ['Master Liquors', 'Master Liqours', 'masterliqours.my'],
    url: SITE,
    logo: `${SITE}/icons/icon-512.png`,
    image: `${SITE}/icons/og-image.png`,
    description: DATA.summary,
    email: DATA.email,
    priceRange: 'RM50 - RM5,000',
    currenciesAccepted: 'MYR',
    address: { '@type': 'PostalAddress', addressLocality: 'Kuala Lumpur', addressRegion: 'Wilayah Persekutuan Kuala Lumpur', addressCountry: 'MY' },
    areaServed: DATA.areas.map((a) => ({ '@type': 'City', name: a.name })),
    knowsAbout: DATA.categories.map((c) => c === 'Whiskey' ? 'Whisky' : c),
    potentialAction: { '@type': 'OrderAction', target: `${SITE}/products` },
    parentOrganization: { '@type': 'Organization', name: DATA.legalOperator, url: 'https://harnova.my' },
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: SITE,
    name: DATA.name,
    publisher: { '@id': `${SITE}/#store` },
    potentialAction: { '@type': 'SearchAction', target: `${SITE}/products?search={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };
}

export function faqLd(items = DATA.faq) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

export function crumbsLd(trail) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) };
}

export function productLd(p) {
  const name = prettyName(p.name);
  const { size } = parseSpecs(p.name);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': productUrl(p) + '#product',
    name,
    sku: p.product_id,
    image: p.image_url ? [p.image_url] : undefined,
    description: productDescription(p),
    brand: { '@type': 'Brand', name: brandOf(name) },
    category: p.category,
    size: size || undefined,
    offers: {
      '@type': 'Offer',
      url: productUrl(p),
      price: Number(p.price).toFixed(2),
      priceCurrency: 'MYR',
      availability: p.is_preorder ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE}/#store` },
      eligibleRegion: { '@type': 'Country', name: 'MY' },
      areaServed: DATA.areas.map((a) => a.name),
    },
  };
}

export function itemListLd(products, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: productUrl(p), name: prettyName(p.name) })),
  };
}

/* ---------- visible HTML for crawlers ---------- */
const NAV = () => `<nav aria-label="Main"><a href="/">Masterliqours</a> · <a href="/products">Shop all bottles</a> · ${DATA.categories.map((c) => `<a href="/products?category=${encodeURIComponent(c)}">${esc(c === 'Whiskey' ? 'Whisky' : c)}</a>`).join(' · ')} · <a href="/delivery">Delivery areas</a> · <a href="/faq">FAQ</a> · <a href="/bulk-order">Bulk orders</a></nav>`;
const FOOT = () => `<footer><p>${esc(DATA.name)}: ${esc(DATA.tagline)}. Same-day delivery across ${DATA.areas.slice(2).map((a) => `<a href="/delivery/${a.slug}">${esc(a.name)}</a>`).join(', ')}, <a href="/delivery/kuala-lumpur">Kuala Lumpur</a> and the <a href="/delivery/klang-valley">Klang Valley</a>. Free delivery above RM1,250. New customers: code ML10 for 10% off. Strictly 21+. Contact: ${esc(DATA.email)}.</p></footer>`;

export function productCards(list) {
  return `<ul>${list.map((p) => {
    const sale = p.original_price && p.original_price > p.price ? ` <s>${rm(p.original_price)}</s>` : '';
    return `<li><a href="/product/${p.product_id}">${esc(prettyName(p.name))}</a> (${esc(p.category)}): ${rm(p.price)}${sale}, ${p.is_preorder ? 'pre-order' : 'in stock'}</li>`;
  }).join('')}</ul>`;
}

export function shell(inner) {
  return `<div id="ssr-seo" style="max-width:960px;margin:0 auto;padding:96px 20px 40px;color:#ddd;font:15px/1.6 system-ui,sans-serif">${NAV()}<main>${inner}</main>${FOOT()}<style>#ssr-seo a{color:#ff4fa3}#ssr-seo h1,#ssr-seo h2{color:#fff;font-family:'Bebas Neue',system-ui,sans-serif;letter-spacing:.5px}</style></div>`;
}

/* ---------- rewrite index.html for a page ---------- */
class SetAttr { constructor(attr, val) { this.attr = attr; this.val = val; } element(el) { el.setAttribute(this.attr, this.val); } }
class SetText { constructor(t) { this.t = t; } element(el) { el.setInnerContent(this.t); } }
class Append { constructor(html) { this.html = html; } element(el) { el.append(this.html, { html: true }); } }
class SetHtml { constructor(html) { this.html = html; } element(el) { el.setInnerContent(this.html, { html: true }); } }
class Remove { element(el) { el.remove(); } }

export async function renderPage(context, { title, description, path, image, jsonld = [], body, status = 200, noindex = false }) {
  const { request, env } = context;
  const shellRes = await env.ASSETS.fetch(new Request(new URL('/', request.url).toString(), { headers: request.headers }));
  const url = SITE + path;
  const desc = String(description).slice(0, 300);
  const img = image || `${SITE}/icons/og-image.png`;
  const head = [
    `<link rel="canonical" href="${esc(url)}" />`,
    noindex ? '<meta name="robots" content="noindex,follow" />' : '<meta name="robots" content="index,follow,max-image-preview:large" />',
    `<meta property="og:site_name" content="Masterliqours" />`,
    `<meta property="og:locale" content="en_MY" />`,
    ...jsonld.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].join('\n');

  const out = new HTMLRewriter()
    .on('title', new SetText(title))
    .on('meta[name="description"]', new SetAttr('content', desc))
    .on('meta[property="og:title"]', new SetAttr('content', title))
    .on('meta[property="og:description"]', new SetAttr('content', desc))
    .on('meta[property="og:url"]', new SetAttr('content', url))
    .on('meta[property="og:image"]', new SetAttr('content', img))
    .on('meta[property="twitter:title"]', new SetAttr('content', title))
    .on('meta[property="twitter:description"]', new SetAttr('content', desc))
    .on('meta[property="twitter:image"]', new SetAttr('content', img))
    .on('script[type="application/ld+json"]', new Remove())
    .on('head', new Append(head))
    .on('div#root', new SetHtml(shell(body)))
    .transform(shellRes);

  const h = new Headers(out.headers);
  h.set('content-type', 'text/html; charset=utf-8');
  h.set('cache-control', 'public, max-age=0, must-revalidate');
  h.delete('content-length');
  return new Response(out.body, { status, headers: h });
}

/** Wrap a page handler so any failure falls back to the normal app. */
export const safe = (fn) => async (context) => {
  try { return await fn(context); } catch (e) { console.log('seo fallback', e && e.message); return context.env.ASSETS.fetch(new URL('/', context.request.url).toString()); }
};
