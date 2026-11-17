/*
 * Analytics relay: the site sends small events here (same domain, so ad
 * blockers and CORS don't get in the way). We add the visitor's approximate
 * location from Cloudflare (country / state / city - never the IP address)
 * and pass it to the Masterliqours API. Always answers instantly.
 */
const API = 'https://master-liqours-sg.onrender.com/api/analytics/collect';

export async function onRequestPost({ request, env, waitUntil }) {
  try {
    const text = await request.text();
    if (text.length > 4000) return new Response(null, { status: 204 });
    const body = JSON.parse(text);
    const cf = request.cf || {};
    const payload = {
      ...body,
      ua: request.headers.get('user-agent') || '',
      country: cf.country || null,
      region: cf.region || null,
      city: cf.city || null,
    };
    waitUntil(fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-analytics-key': env.ANALYTICS_KEY || '' },
      body: JSON.stringify(payload),
    }).catch(() => {}));
  } catch (e) { /* ignore bad input */ }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
