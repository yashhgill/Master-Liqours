import { allProducts, DATA, SITE } from '../seo-lib/render.js';

export async function onRequestGet() {
  let products = [];
  try { products = await allProducts(); } catch (e) {}
  const today = new Date().toISOString().slice(0, 10);
  const u = (loc, pr, cf = 'weekly', img) => `<url><loc>${loc.replace(/&/g, '&amp;')}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority>${img ? `<image:image><image:loc>${img.replace(/&/g, '&amp;')}</image:loc></image:image>` : ''}</url>`;
  const urls = [
    u(SITE + '/', '1.0', 'daily'),
    u(SITE + '/products', '0.9', 'daily'),
    u(SITE + '/products?available=1', '0.9', 'daily'),
    ...DATA.categories.map((c) => u(`${SITE}/products?category=${encodeURIComponent(c)}`, '0.8', 'daily')),
    u(SITE + '/delivery', '0.8'),
    ...DATA.areas.map((a) => u(`${SITE}/delivery/${a.slug}`, '0.8')),
    u(SITE + '/faq', '0.7', 'monthly'),
    u(SITE + '/bulk-order', '0.6', 'monthly'),
    ...products.map((p) => u(`${SITE}/product/${p.product_id}`, p.is_preorder ? '0.5' : '0.7', 'daily', p.image_url)),
    ...['terms', 'privacy', 'refund'].map((l) => u(`${SITE}/legal/${l}`, '0.2', 'yearly')),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
