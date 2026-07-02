import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaChartLine, FaBoxOpen, FaClock, FaBolt, FaArrowUp, FaArrowDown, FaTrophy } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Stat = ({ label, value, color, icon: Icon, sub, trend }) => (
  <div style={{ padding: '20px 22px', border: `1px solid ${color}22`, borderRadius: 20, background: `${color}08`, transition: 'all 0.3s' }}
    onMouseEnter={e => e.currentTarget.style.borderColor = `${color}44`}
    onMouseLeave={e => e.currentTarget.style.borderColor = `${color}22`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
      <Icon size={14} style={{ color }} />
    </div>
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, letterSpacing: '-0.01em', color, textShadow: `0 0 20px ${color}55`, lineHeight: 1 }}>{value}</div>
    {sub && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
        {trend === 'up' && <FaArrowUp size={9} style={{ color: '#39ff14' }} />}
        {trend === 'down' && <FaArrowDown size={9} style={{ color: '#ff007f' }} />}
        {sub}
      </div>
    )}
  </div>
);

// Simple bar chart — no external lib needed
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
            {d.revenue > 0 ? `RM${d.revenue >= 1000 ? (d.revenue/1000).toFixed(1)+'k' : d.revenue}` : '—'}
          </div>
          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.5s', minHeight: 2,
            height: `${Math.max(2, (d.revenue / max) * 72)}px`,
            background: i === data.length - 1
              ? 'linear-gradient(180deg, #ff007f, #c8005a)'
              : 'rgba(255,255,255,0.12)'
          }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{d.date}</div>
        </div>
      ))}
    </div>
  );
};

const OverviewTab = () => {
  const [a, setA] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/analytics`, { withCredentials: true }),
      axios.get(`${API}/admin/all-orders`, { params: { limit: 10 }, withCredentials: true }),
    ]).then(([an, or]) => {
      setA(an.data);
      setOrders(or.data || []);
    }).catch(() => {});
  }, []);

  if (!a) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ height: 100, borderRadius: 20, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
    </div>
  );

  const todayVsYest = a.yesterday_sales > 0
    ? ((a.today_sales - a.yesterday_sales) / a.yesterday_sales * 100).toFixed(1)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} data-testid="admin-overview-panel">

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }} className="sm:grid-cols-4">
        <Stat label="Total Revenue" value={`RM${(a.total_sales||0).toLocaleString('en-MY', {minimumFractionDigits:0, maximumFractionDigits:0})}`} color="#ff007f" icon={FaChartLine}
          sub={`Yesterday: RM${(a.yesterday_sales||0).toFixed(0)}`}
          trend={todayVsYest > 0 ? 'up' : todayVsYest < 0 ? 'down' : null} />
        <Stat label="Today's Sales" value={`RM${(a.today_sales||0).toFixed(0)}`} color="#ffd700" icon={FaBolt}
          sub={todayVsYest ? `${todayVsYest > 0 ? '+' : ''}${todayVsYest}% vs yesterday` : 'First day!'}
          trend={todayVsYest > 0 ? 'up' : todayVsYest < 0 ? 'down' : null} />
        <Stat label="Total Orders" value={a.total_orders||0} color="#00f0ff" icon={FaBoxOpen}
          sub={`Today: ${a.today_orders||0} orders`} />
        <Stat label="Pending" value={a.pending_orders||0} color={a.pending_orders > 10 ? '#ff007f' : '#ffd700'} icon={FaClock}
          sub={a.pending_orders > 0 ? 'Need attention boss!' : 'All clear!'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Revenue chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Revenue — Last 7 Days</div>
          <BarChart data={a.daily_revenue || []} />
        </div>

        {/* Top products */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16, display:'flex', alignItems:'center', gap: 8 }}>
            <FaTrophy size={10} style={{ color: '#ffd700' }} /> Top Products
          </div>
          {(a.top_products || []).length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No sales data yet lah.</div>
            : (a.top_products || []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: i===0?'#ffd700':i===1?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)', width: 20 }}>#{i+1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.sold} units sold</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ff007f', flexShrink: 0 }}>RM{p.price}</div>
              </div>
            ))
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Sales by staff */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Sales by Staff</div>
          {(a.staff_sales || []).length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No staff sales yet.</div>
            : (a.staff_sales || []).sort((x,y)=>(y.sales||0)-(x.sales||0)).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, marginBottom: 8 }} data-testid="overview-staff-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.orders || 0} orders</div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#ff007f' }}>RM{(s.sales||0).toFixed(0)}</div>
              </div>
            ))
          }
        </div>

        {/* Recent orders */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Recent Orders</div>
          {orders.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No orders yet boss.</div>
            : orders.slice(0, 8).map((o) => (
              <div key={o.order_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, marginBottom: 8 }} data-testid="overview-order-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>#{o.order_id.slice(0,8).toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{new Date(o.created_at).toLocaleDateString('en-MY')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#ff007f' }}>RM{o.total.toFixed(0)}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: o.status==='delivered'?'#39ff14':o.status==='cancelled'?'#ff007f':'#ffd700' }}>{o.status}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
