import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaSyncAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RANGES = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days']];
const nf = (n) => Number(n || 0).toLocaleString('en-MY');
const rm = (n) => `RM${Number(n || 0).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
const MY_STATES = { 'Kuala Lumpur': 'Kuala Lumpur', Selangor: 'Selangor', Putrajaya: 'Putrajaya' };
const COUNTRY = { MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', TH: 'Thailand', US: 'United States', GB: 'United Kingdom', AU: 'Australia', IN: 'India', CN: 'China', PH: 'Philippines', '?': 'Unknown' };

const Card = ({ title, children, sub, className = '' }) => (
  <div className={`surface p-5 ${className}`}>
    <div className="flex items-baseline justify-between gap-3 mb-4">
      <div className="font-display text-xl uppercase tracking-wide">{title}</div>
      {sub && <div className="text-[11px] text-white/45">{sub}</div>}
    </div>
    {children}
  </div>
);

const Stat = ({ label, value, prev, color = '#fff', note }) => {
  const change = prev ? Math.round(((Number(String(value).replace(/[^\d.]/g, '')) - prev) / prev) * 100) : null;
  return (
    <div className="surface p-4 sm:p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">{label}</div>
      <div className="font-display text-2xl sm:text-3xl" style={{ color }}>{value}</div>
      <div className="text-[11px] mt-1 min-h-[16px]">
        {change !== null && Number.isFinite(change) && (
          <span className={change >= 0 ? 'text-[#39ff14]' : 'text-[#ff5c8a]'}>
            {change >= 0 ? <FaArrowUp className="inline" size={9} /> : <FaArrowDown className="inline" size={9} />} {Math.abs(change)}% vs previous
          </span>
        )}
        {note && <span className="text-white/45">{note}</span>}
      </div>
    </div>
  );
};

const BarList = ({ rows, color = '#ff007f', empty = 'No data yet', label = (r) => r.name, max: maxRows = 10 }) => {
  const list = (rows || []).slice(0, maxRows);
  if (!list.length) return <div className="text-sm text-white/40">{empty}</div>;
  const max = Math.max(...list.map((r) => r.count), 1);
  return (
    <div className="space-y-2">
      {list.map((r, i) => (
        <div key={i} className="relative rounded-lg overflow-hidden bg-white/[0.03]">
          <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${(r.count / max) * 100}%`, background: `${color}26` }} />
          <div className="relative flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
            <span className="truncate text-white/85">{label(r)}</span>
            <span className="font-bold tabular-nums text-white">{nf(r.count)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* Visitors per day (bars) with orders (pink dots) */
const DailyChart = ({ data }) => {
  const W = 760, H = 200, P = 26;
  const maxV = Math.max(1, ...data.map((d) => d.visitors));
  const bw = (W - P * 2) / Math.max(1, data.length);
  const step = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full h-auto" role="img" aria-label="Visitors per day">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={P} x2={W - P} y1={H - (H - 20) * f} y2={H - (H - 20) * f} stroke="rgba(255,255,255,0.06)" />
          <text x={P - 6} y={H - (H - 20) * f + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.4)">{Math.round(maxV * f)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = ((H - 20) * d.visitors) / maxV;
        const x = P + i * bw;
        return (
          <g key={d.day}>
            <rect x={x + bw * 0.15} y={H - h} width={Math.max(1, bw * 0.7)} height={h} rx={Math.min(4, bw * 0.3)} fill="#00f0ff" opacity="0.75">
              <title>{`${d.day}: ${d.visitors} visitors, ${d.views} page views, ${d.orders} orders`}</title>
            </rect>
            {d.orders > 0 && <circle cx={x + bw / 2} cy={H - h - 8} r="4" fill="#ff007f"><title>{`${d.orders} orders`}</title></circle>}
            {i % step === 0 && <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)">{d.day.slice(5)}</text>}
          </g>
        );
      })}
    </svg>
  );
};

const HoursChart = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-28">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 rounded-t" title={`${d.hour}:00 - ${d.count} page views`}
            style={{ height: `${Math.max(3, (d.count / max) * 100)}%`, background: d.count === max && d.count > 0 ? '#ff007f' : 'rgba(255,0,127,0.35)' }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/40 mt-1"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
    </div>
  );
};

const Funnel = ({ steps }) => {
  const top = Math.max(1, steps[0]?.count || 0);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center gap-3">
          <div className="w-36 shrink-0 text-sm text-white/75">{s.step}</div>
          <div className="flex-1 h-7 rounded-lg bg-white/[0.03] overflow-hidden">
            <div className="h-full rounded-lg flex items-center px-2 text-xs font-bold" style={{ width: `${Math.max(4, (s.count / top) * 100)}%`, background: 'linear-gradient(90deg,#ff007f,#c8005a)' }}>{nf(s.count)}</div>
          </div>
          <div className="w-12 text-right text-xs text-white/50 tabular-nums">{i === 0 ? '' : `${Math.round((s.count / top) * 100)}%`}</div>
        </div>
      ))}
    </div>
  );
};

const ProductTable = ({ rows, empty, showCarts = true }) => (
  rows?.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-white/45">
            <th className="py-2 pr-3">Bottle</th><th className="py-2 pr-3 text-right">Views</th>
            {showCarts && <th className="py-2 pr-3 text-right">Carts</th>}<th className="py-2 text-right">Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product_id} className="border-t border-white/5">
              <td className="py-2 pr-3 max-w-[260px]"><Link to={`/product/${r.product_id}`} target="_blank" className="hover:text-[#ff007f] truncate block">{r.name}</Link><span className="text-[11px] text-white/40">{r.category}</span></td>
              <td className="py-2 pr-3 text-right tabular-nums">{nf(r.views)}</td>
              {showCarts && <td className="py-2 pr-3 text-right tabular-nums">{nf(r.carts)}</td>}
              <td className="py-2 text-right">
                {r.stock > 0 ? <span className="text-[#39ff14] font-bold">{r.stock}</span> : <span className="text-[11px] font-bold uppercase text-[#ffd27a] bg-[#ffd27a]/10 px-2 py-0.5 rounded-full">Out</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <div className="text-sm text-white/40">{empty}</div>
);

const AnalyticsTab = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true); setErr('');
    axios.get(`${API}/admin/site-analytics`, { params: { days }, withCredentials: true })
      .then((r) => { if (r.data && r.data.summary) setData(r.data); else setErr('Analytics is updating, try again in a minute.'); })
      .catch((e) => setErr(e.response?.data?.detail || 'Could not load analytics'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = data?.summary;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-3xl uppercase">Analytics</div>
          <div className="text-xs text-white/50">Who visits, where they come from, what they look for, and what to stock next. Admin and staff browsing is not counted.</div>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${days === d ? 'bg-[#ff007f] border-[#ff007f] text-white' : 'border-white/15 text-white/70 hover:border-white/40'}`}>{l}</button>
          ))}
          <button onClick={load} title="Refresh" className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:text-white"><FaSyncAlt size={11} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {err && <div className="surface p-4 text-[#ff5c8a] text-sm">{err}</div>}
      {!data && !err && <div className="surface p-10 text-center text-white/50">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Stat label="Visitors" value={nf(s.visitors)} prev={s.visitors_prev} color="#00f0ff" />
            <Stat label="Page views" value={nf(s.pageviews)} prev={s.pageviews_prev} />
            <Stat label="Bottles viewed" value={nf(s.product_views)} />
            <Stat label="Added to cart" value={nf(s.add_to_cart)} color="#ffd27a" />
            <Stat label="Orders" value={nf(s.orders)} color="#39ff14" note={`${rm(s.revenue)} · ${s.conversion}% of visitors`} />
            <Stat label="WhatsApp taps" value={nf(s.whatsapp)} color="#25d366" />
          </div>

          <Card title="Visitors per day" sub="Blue bars: visitors · pink dots: orders (Malaysia time)">
            <DailyChart data={data.daily} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Shopping funnel" sub="Visitors who reached each step"><Funnel steps={data.funnel} /></Card>
            <Card title="Busiest hours" sub="Page views by hour, Malaysia time"><HoursChart data={data.hours} /></Card>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            <Card title="Where visitors come from" sub="First page of each visit"><BarList rows={data.sources} color="#00f0ff" /></Card>
            <Card title="Malaysian states"><BarList rows={data.regions} color="#ff007f" label={(r) => MY_STATES[r.name] || r.name} /></Card>
            <Card title="Cities"><BarList rows={data.cities} color="#ffd27a" /></Card>
            <Card title="Countries"><BarList rows={data.countries} color="#39ff14" label={(r) => COUNTRY[r.name] || r.name} /></Card>
            <Card title="Devices"><BarList rows={data.devices} color="#00f0ff" /></Card>
            <Card title="Browsers & apps"><BarList rows={data.browsers} color="#ff007f" /></Card>
          </div>

          <div className="font-display text-2xl uppercase pt-2">Inventory insights</div>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="Stock these next" sub="Viewed a lot but out of stock right now" className="border border-[#ffd27a]/30">
              <ProductTable rows={data.stock_these} empty="No out-of-stock bottles getting views yet." />
            </Card>
            <Card title="Searched but not found" sub="Customers wanted these and got zero results" className="border border-[#ff007f]/30">
              <BarList rows={data.zero_searches} color="#ff007f" empty="No failed searches yet." label={(r) => `"${r.name}"`} />
            </Card>
            <Card title="Most viewed bottles"><ProductTable rows={data.top_viewed} empty="No bottle views yet." /></Card>
            <Card title="Top searches"><BarList rows={data.searches} color="#00f0ff" empty="No searches yet." label={(r) => `"${r.name}"`} max={15} /></Card>
            <Card title="Most added to cart"><ProductTable rows={data.top_carted} empty="Nothing added to cart yet." /></Card>
            <Card title="Popular categories" sub="Bottle views + category taps"><BarList rows={data.categories} color="#ffd27a" label={(r) => (r.name === 'Whiskey' ? 'Whisky' : r.name)} /></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card title="Top pages"><BarList rows={data.pages} color="#00f0ff" max={12} /></Card>
            <Card title="Campaigns" sub="Links with ?utm_campaign=…">
              <BarList rows={data.campaigns} color="#39ff14" empty="Add ?utm_source=instagram&utm_campaign=xmas to links you share to see them here." />
            </Card>
          </div>

          <p className="text-[11px] text-white/40">
            Counting started 18 Nov 2026. A visitor is one browsing session. Bots, admins and staff are excluded. No cookies, IP addresses or personal details are stored; locations are approximate (city level) from Cloudflare.
          </p>
        </>
      )}
    </div>
  );
};

export default AnalyticsTab;
