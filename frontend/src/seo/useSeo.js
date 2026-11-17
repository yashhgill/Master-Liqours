import { useEffect } from 'react';

const SITE = 'https://www.masterliqours.my';

function setMeta(selector, attr, key, value) {
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

/** Keeps the tab title, description and canonical URL right as people move around the app. */
export default function useSeo({ title, description, path }) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    if (path) {
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = SITE + path;
      setMeta('meta[property="og:url"]', 'property', 'og:url', SITE + path);
    }
  }, [title, description, path]);
}

/** "JW BLUE LABEL 40% 750ML" -> "Johnnie Walker Blue Label 40% 750ml" (matches the server-side version) */
export function prettyName(raw) {
  const ABBR = { JW: 'Johnnie Walker', JD: "Jack Daniel's" };
  const KEEP = new Set(['XO', 'VS', 'VSOP', 'XXO', 'XR', 'NV', 'II', 'III', 'IV', 'USA', 'UK', 'IPA']);
  const FIX = { DEWARS: "Dewar's", HENDRICKS: "Hendrick's", DANIELS: "Daniel's", MOET: 'Moët', JAGERMEISTER: 'Jägermeister' };
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
  }).join(' ');
}
