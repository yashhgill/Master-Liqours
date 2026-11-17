import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { FaMapMarkerAlt, FaTruck, FaWhatsapp, FaGift, FaArrowRight, FaIdCard } from 'react-icons/fa';
import ProductCard from '../components/ProductCard';
import SEO from '../seo/seo-data.json';
import useSeo from '../seo/useSeo';
import NotFound from './NotFound';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const glass = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, backdropFilter: 'blur(12px)' };
const H = ({ children, as: Tag = 'h2', size = 34 }) => (
  <Tag style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: size, letterSpacing: 1, color: '#fff', lineHeight: 1.05, margin: 0 }}>{children}</Tag>
);
const catLabel = (c) => (c === 'Whiskey' ? 'Whisky' : c);

const Perks = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginTop: 28 }}>
    {[
      [FaTruck, 'Same-day delivery', 'Across KL & Klang Valley'],
      [FaWhatsapp, 'Pay via WhatsApp', 'Confirmed before delivery'],
      [FaGift, 'Free delivery', 'On orders above RM1,250'],
      [FaIdCard, '21+ only', 'ID may be checked'],
    ].map(([Icon, t, s]) => (
      <div key={t} style={{ ...glass, padding: 16 }}>
        <Icon color="#ff007f" size={18} />
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 10 }}>{t}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{s}</div>
      </div>
    ))}
  </div>
);

const Faq = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {items.map((f) => (
      <details key={f.q} style={{ ...glass, padding: '16px 20px' }}>
        <summary style={{ color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>{f.q}</summary>
        <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.7, fontSize: 14 }}>{f.a}</p>
      </details>
    ))}
  </div>
);

export function DeliveryIndex() {
  useSeo({
    title: 'Alcohol Delivery Areas: KL, PJ, Shah Alam, Subang & Klang Valley | Masterliqours',
    description: 'Masterliqours delivers whisky, cognac, wine & spirits same-day across Kuala Lumpur and the Klang Valley.',
    path: '/delivery',
  });
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ color: '#ff007f', fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Where we deliver</div>
      <H as="h1" size={52}>Alcohol delivery across the <span style={{ color: '#ff007f' }}>Klang Valley</span></H>
      <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 720, marginTop: 14, lineHeight: 1.7 }}>{SEO.summary}</p>
      <Perks />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginTop: 36 }}>
        {SEO.areas.map((a) => (
          <Link key={a.slug} to={`/delivery/${a.slug}`} style={{ ...glass, padding: 20, textDecoration: 'none', display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FaMapMarkerAlt color="#00f0ff" /><H size={24}>{a.name}</H></div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{a.neighbourhoods.slice(0, 6).join(' · ')}</div>
            <div style={{ color: '#ff007f', fontSize: 13, fontWeight: 700, marginTop: 12 }}>See delivery details <FaArrowRight size={10} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DeliveryArea() {
  const { area } = useParams();
  const a = SEO.areas.find((x) => x.slug === area);
  const [items, setItems] = useState([]);
  useSeo(a ? {
    title: `Alcohol Delivery ${a.name} | Same-Day Liquor Delivery ${a.short} – Masterliqours`,
    description: a.intro,
    path: `/delivery/${a.slug}`,
  } : {});
  useEffect(() => {
    if (!a) return;
    axios.get(API + '/products', { params: { page: 1, limit: 12, sort: 'random', available_only: true } })
      .then((r) => setItems(r.data?.products || [])).catch(() => {});
  }, [area]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <NotFound />;

  const faqs = [
    { q: `Do you deliver alcohol to ${a.name}?`, a: `Yes. Masterliqours delivers whisky, cognac, wine, champagne and spirits to ${a.name}, including ${a.neighbourhoods.slice(0, 5).join(', ')}.` },
    { q: `Is same-day alcohol delivery available in ${a.name}?`, a: `Yes, in-stock bottles are delivered the same day across ${a.name} (times are estimates). ${a.notes}` },
    { q: `How much is alcohol delivery to ${a.name}?`, a: 'Delivery is free on orders above RM1,250. For smaller orders the fee is shown at checkout.' },
    SEO.faq.find((f) => f.q.startsWith('How old')),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <nav style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
        <Link to="/" style={{ color: 'inherit' }}>Home</Link> › <Link to="/delivery" style={{ color: 'inherit' }}>Delivery areas</Link> › {a.name}
      </nav>
      <div style={{ color: '#ff007f', fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Same-day delivery · {a.short}</div>
      <H as="h1" size={52}>Alcohol delivery in <span style={{ color: '#ff007f' }}>{a.name}</span></H>
      <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 760, marginTop: 14, lineHeight: 1.7, fontSize: 16 }}>{a.intro}</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 760, marginTop: 8, lineHeight: 1.7, fontSize: 14 }}>{a.notes}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
        <Link to="/products?available=1" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#ff007f,#c8005a)', color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '13px 26px', borderRadius: 50, textDecoration: 'none', boxShadow: '0 0 30px rgba(255,0,127,0.4)' }}>Shop in-stock bottles <FaArrowRight size={12} /></Link>
        <Link to="/bulk-order" style={{ ...glass, borderRadius: 50, padding: '12px 22px', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Bulk &amp; event orders</Link>
      </div>
      <Perks />

      <div style={{ marginTop: 44 }}>
        <H>Areas we cover in {a.short}</H>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {a.neighbourhoods.map((n) => (
            <span key={n} style={{ ...glass, borderRadius: 50, padding: '6px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{n}</span>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <H>In stock now for {a.short}</H>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ marginTop: 16 }}>
            {items.slice(0, 8).map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        </div>
      )}

      <div style={{ marginTop: 44 }}>
        <H>Shop by category</H>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {SEO.categories.map((c) => (
            <Link key={c} to={`/products?category=${c}`} style={{ ...glass, borderRadius: 50, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{catLabel(c)}</Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 44 }}>
        <H>Questions about delivery to {a.short}</H>
        <div style={{ marginTop: 16 }}><Faq items={faqs} /></div>
      </div>

      <div style={{ marginTop: 44, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 2 }}>
        Also delivering to:{' '}
        {SEO.areas.filter((x) => x.slug !== a.slug).map((x, i) => (
          <React.Fragment key={x.slug}>{i > 0 && ' · '}<Link to={`/delivery/${x.slug}`} style={{ color: 'rgba(255,255,255,0.7)' }}>{x.name}</Link></React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function FaqPage() {
  useSeo({
    title: 'FAQ: Ordering Alcohol Online in KL & Klang Valley | Masterliqours',
    description: 'How liquor delivery works at Masterliqours: delivery areas, same-day delivery, payment, free delivery over RM1,250, ML10 code, 21+ rules.',
    path: '/faq',
  });
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ color: '#ff007f', fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Help</div>
      <H as="h1" size={52}>Frequently asked <span style={{ color: '#ff007f' }}>questions</span></H>
      <div style={{ marginTop: 24 }}><Faq items={SEO.faq} /></div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 28 }}>
        Still stuck? <Link to="/delivery" style={{ color: '#ff007f' }}>See delivery areas</Link> or <Link to="/products" style={{ color: '#ff007f' }}>start shopping</Link>.
      </p>
    </div>
  );
}
