import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaDownload, FaPrint, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Current month in Malaysia time, as YYYY-MM
const thisMonth = () => {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const shiftMonth = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const rm = (n) => `RM${Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

const Stat = ({ label, value, sub, color = '#fff' }) => (
  <div className="surface p-5">
    <div className="eyebrow !mb-2">{label}</div>
    <div className="font-display text-2xl sm:text-3xl" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] text-white/45 mt-1">{sub}</div>}
  </div>
);

const Table = ({ head, rows, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-white/40">
          {head.map((h, i) => <th key={i} className={`py-2 pr-3 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className="py-4 text-white/40 text-center">{empty}</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i} className="border-t border-white/5">
            {r.map((c, j) => <td key={j} className={`py-2 pr-3 ${j > 0 ? 'text-right whitespace-nowrap' : ''}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ReportsTab = () => {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true); setErr('');
    axios.get(`${API}/admin/reports/monthly`, { params: { month }, withCredentials: true })
      .then(r => { if (!cancel) setData(r.data); })
      .catch(e => { if (!cancel) { setData(null); setErr(e.response?.data?.detail || 'Could not load report'); } })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [month]);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const r = await axios.get(`${API}/admin/reports/monthly.csv`, { params: { month }, responseType: 'blob', withCredentials: true });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = `masterliqours-orders-${month}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { setErr('Download failed — try again'); }
    finally { setDownloading(false); }
  };

  const s = data?.summary;
  const maxDay = Math.max(1, ...(data?.daily || []).map(d => d.sales));

  return (
    <div className="space-y-6 reports-print" data-testid="admin-reports-panel">
      <style>{`@media print { body * { visibility: hidden; } .reports-print, .reports-print * { visibility: visible; } .reports-print { position: absolute; left: 0; top: 0; width: 100%; color: #000; } .no-print { display: none !important; } .reports-print .surface { border: 1px solid #ccc; background: #fff; } .reports-print * { color: #000 !important; text-shadow: none !important; } }`}</style>

      {/* Month picker + actions */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="no-print w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:border-white/40" aria-label="Previous month"><FaChevronLeft size={12} /></button>
          <div className="font-display text-2xl uppercase min-w-[180px] text-center">{monthLabel(month)}</div>
          <button onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={month >= thisMonth()} className="no-print w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:border-white/40 disabled:opacity-30" aria-label="Next month"><FaChevronRight size={12} /></button>
          <input type="month" value={month} max={thisMonth()} onChange={e => e.target.value && setMonth(e.target.value)} className="no-print input-dark !w-auto text-sm" />
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={downloadCsv} disabled={downloading || !s || s.orders === 0} className="btn-lime flex items-center gap-2 disabled:opacity-40"><FaDownload size={12} /> {downloading ? 'Preparing…' : 'Download Excel (CSV)'}</button>
          <button onClick={() => window.print()} disabled={!s} className="btn-ghost flex items-center gap-2 disabled:opacity-40"><FaPrint size={12} /> Print / PDF</button>
        </div>
      </div>

      {loading && <div className="surface p-10 text-center text-white/60">Loading report…</div>}
      {err && !loading && <div className="surface p-6 text-center text-[#ff007f]">{err}</div>}

      {s && !loading && (
        <>
          {s.orders === 0 && <div className="surface p-6 text-center text-white/50">No orders in {monthLabel(month)} yet.</div>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Sales (excl. cancelled)" value={rm(s.gross_sales)} sub={`${s.orders_excl_cancelled} orders · avg ${rm(s.avg_order_value)}`} color="#39ff14" />
            <Stat label="Delivered (completed)" value={rm(s.delivered_revenue)} sub={`${s.delivered_orders} orders`} color="#00f0ff" />
            <Stat label="Still to deliver" value={rm(s.outstanding_value)} sub={`${s.outstanding_orders} open orders`} color="#ffd700" />
            <Stat label="Cancelled" value={rm(s.cancelled_value)} sub={`${s.cancelled_orders} orders`} color="#ff007f" />
            <Stat label="Payment proofs received" value={rm(s.payment_proof_value)} sub={`${s.payment_proofs} of ${s.orders_excl_cancelled} orders uploaded proof`} />
            <Stat label="Discounts given" value={rm(s.discounts_given)} sub="Tier / promo discounts" />
            <Stat label="Bottles sold" value={s.bottles_sold} sub="Excl. cancelled orders" />
            <Stat label="Customers" value={s.unique_customers} sub="Who ordered this month" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="surface p-5">
              <div className="eyebrow !mb-3">Orders by status</div>
              <Table head={['Status', 'Orders', 'Amount']} empty="No orders"
                rows={Object.entries(data.by_status).map(([k, v]) => [STATUS_LABEL[k] || k, v.orders, rm(v.amount)])} />
            </div>
            <div className="surface p-5">
              <div className="eyebrow !mb-3">By staff</div>
              <Table head={['Staff', 'Orders', 'Delivered', 'Sales']} empty="No orders"
                rows={data.by_staff.map(r => [r.staff, r.orders, r.delivered, rm(r.sales)])} />
            </div>
          </div>

          <div className="surface p-5">
            <div className="eyebrow !mb-3">Daily sales</div>
            {data.daily.length === 0 ? <div className="text-white/40 text-sm text-center py-4">No sales</div> : (
              <div className="space-y-1.5">
                {data.daily.map(d => (
                  <div key={d.date} className="flex items-center gap-3 text-xs">
                    <div className="w-20 shrink-0 text-white/60">{d.date.slice(5)}</div>
                    <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-[#39ff14]" style={{ width: `${(d.sales / maxDay) * 100}%` }} />
                    </div>
                    <div className="w-28 shrink-0 text-right">{rm(d.sales)} <span className="text-white/40">({d.orders})</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface p-5">
            <div className="eyebrow !mb-3">Top bottles</div>
            <Table head={['Bottle', 'Qty', 'Revenue']} empty="No bottles sold"
              rows={data.top_products.map(p => [p.product, p.qty, rm(p.revenue)])} />
          </div>
          <div className="text-[11px] text-white/35">Times are Malaysia time. "Payment proofs" counts orders where the customer uploaded a payment proof. Download the CSV for every order line by line.</div>
        </>
      )}
    </div>
  );
};

export default ReportsTab;
