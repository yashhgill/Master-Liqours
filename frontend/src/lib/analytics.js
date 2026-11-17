/*
 * Tiny first-party analytics. No cookies, no personal data: a random id per
 * browser tab session counts visitors. Events go to /t on our own domain.
 * Admin and staff browsing is never counted.
 */
const SKIP = ['/admin', '/staff', '/master', '/receipt'];
let lastPath = null;

function sid() {
  try {
    let s = sessionStorage.getItem('ml_sid');
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ml_sid', s); }
    return s;
  } catch { return 'nostorage'; }
}

function firstTouch() {
  // Keep where this session came from (first page only), so every event carries it.
  try {
    const saved = sessionStorage.getItem('ml_src');
    if (saved) return JSON.parse(saved);
    const q = new URLSearchParams(window.location.search);
    const src = { referrer: document.referrer || '', utm_source: q.get('utm_source') || q.get('ref') || '', utm_campaign: q.get('utm_campaign') || '' };
    sessionStorage.setItem('ml_src', JSON.stringify(src));
    return src;
  } catch { return {}; }
}

function isStaff() {
  try { return localStorage.getItem('ml_no_track') === '1'; } catch { return false; }
}

export function track(type, data = {}) {
  try {
    const path = window.location.pathname + window.location.search;
    if (isStaff() || SKIP.some((p) => window.location.pathname.startsWith(p))) return;
    if (navigator.webdriver) return;
    const body = JSON.stringify({ type, session_id: sid(), path, ...firstTouch(), ...data });
    if (navigator.sendBeacon) navigator.sendBeacon('/t', new Blob([body], { type: 'text/plain' }));
    else fetch('/t', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch { /* never break the shop */ }
}

export function trackPageview() {
  const p = window.location.pathname + window.location.search;
  if (p === lastPath) return;
  lastPath = p;
  track('pageview');
}

/** Admin/staff browsers stop being counted once they open their dashboard. */
export function markStaffDevice() {
  try { localStorage.setItem('ml_no_track', '1'); } catch { /* ignore */ }
}

/** One listener for WhatsApp and other outbound clicks anywhere on the site. */
export function installClickTracking() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/wa\.me|whatsapp/i.test(href)) track('whatsapp', { query: (a.textContent || '').trim().slice(0, 60) });
    else if (/^https?:/i.test(href) && !href.includes('masterliqours.my')) track('outbound', { query: href.slice(0, 120) });
  }, true);
}
