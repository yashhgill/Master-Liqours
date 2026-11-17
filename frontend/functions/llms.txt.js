import { DATA, SITE } from '../seo-lib/render.js';

/* llms.txt: a plain-text summary for AI assistants (https://llmstxt.org) */
export async function onRequestGet() {
  const t = `# ${DATA.name}

> ${DATA.summary}

## Key facts
${DATA.facts.map((f) => `- ${f}`).join('\n')}
- Website: ${SITE}
- Contact: ${DATA.email}
- Operated by ${DATA.legalOperator}, Malaysia

## Shop
- [All bottles](${SITE}/products): full catalogue with prices in RM
- [In stock now](${SITE}/products?available=1): bottles available for same-day delivery
${DATA.categories.map((c) => `- [${c === 'Whiskey' ? 'Whisky' : c}](${SITE}/products?category=${encodeURIComponent(c)}): ${DATA.categoryCopy[c]}`).join('\n')}
- [Bulk and event orders](${SITE}/bulk-order)

## Delivery areas
${DATA.areas.map((a) => `- [${a.name}](${SITE}/delivery/${a.slug}): ${a.neighbourhoods.slice(0, 6).join(', ')}`).join('\n')}

## FAQ
${DATA.faq.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}

## Optional
- [Full catalogue with live prices (plain text)](${SITE}/llms-full.txt)
- [Terms](${SITE}/legal/terms), [Privacy](${SITE}/legal/privacy), [Refunds](${SITE}/legal/refund)
`;
  return new Response(t, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
