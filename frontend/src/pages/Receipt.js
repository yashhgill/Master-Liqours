import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://master-liqours.onrender.com';

export default function Receipt() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/orders/${orderId}`, { withCredentials: true })
      .then(r => setOrder(r.data))
      .catch(() => setError('Receipt not found or you do not have access.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Masterliqours Receipt #${order.order_number || orderId.slice(0,8).toUpperCase()}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Receipt link copied!');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      Loading receipt...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: '#ff007f', fontSize: 18 }}>{error}</div>
      <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to home</Link>
    </div>
  );

  const subtotal = order.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || order.total || 0;
  const orderNum = order.order_number || orderId.slice(0, 8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#030303', padding: '24px 16px', fontFamily: "'Inter', sans-serif" }}>
      {/* Action buttons — hidden when printing */}
      <div className="no-print" style={{ maxWidth: 600, margin: '0 auto 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Link to="/orders" style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          ← My Orders
        </Link>
        <button onClick={handleShare} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Share 🔗
        </button>
        <button onClick={handlePrint} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#ff007f,#c8005a)', border: 'none', borderRadius: 50, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em' }}>
          Print / Save PDF
        </button>
      </div>

      {/* Receipt */}
      <div ref={printRef} style={{
        maxWidth: 600, margin: '0 auto',
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        color: '#111',
      }}>
        {/* Header */}
        <div style={{ background: '#030303', padding: '32px 32px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 36, color: '#ff007f', letterSpacing: '0.05em', marginBottom: 4 }}>
            MASTERLIQOURS
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Premium Liquor Delivery · KL & Klang Valley
          </div>
          <div style={{ marginTop: 16, display: 'inline-block', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 50, padding: '4px 16px' }}>
            <span style={{ color: '#ffd700', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>RECEIPT</span>
          </div>
        </div>

        {/* Order info */}
        <div style={{ padding: '24px 32px', borderBottom: '2px dashed #e5e5e5' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Order No.', `#${orderNum}`],
              ['Date', orderDate],
              ['Status', order.status?.toUpperCase() || 'PROCESSING'],
              ['Customer', order.customer_name || order.user_name || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{value}</div>
              </div>
            ))}
          </div>
          {order.delivery_address && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Delivery Address</div>
              <div style={{ fontSize: 13, color: '#111' }}>{order.delivery_address}</div>
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ padding: '20px 32px', borderBottom: '2px dashed #e5e5e5' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                {['Item', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Item' ? 'left' : 'right', padding: '6px 0', fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 0', fontSize: 13, color: '#111', fontWeight: 500 }}>{item.product_name || item.name}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: '#666', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: '#666', textAlign: 'right' }}>RM{Number(item.price).toFixed(2)}</td>
                  <td style={{ padding: '10px 0', fontSize: 13, color: '#111', fontWeight: 600, textAlign: 'right' }}>RM{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: '20px 32px', borderBottom: '2px dashed #e5e5e5' }}>
          {[
            ['Subtotal', `RM${subtotal.toFixed(2)}`],
            ...(order.shipping_cost > 0 ? [['Delivery', `RM${Number(order.shipping_cost).toFixed(2)}`]] : [['Delivery', 'To be confirmed']]),
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#666' }}>
              <span>{l}</span><span>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid #111', fontSize: 18, fontWeight: 800, color: '#111' }}>
            <span>TOTAL</span>
            <span style={{ color: '#ff007f' }}>RM{Number(order.total || subtotal).toFixed(2)}</span>
          </div>
        </div>

        {/* Staff info */}
        {(order.staff_name || order.staff_whatsapp) && (
          <div style={{ padding: '16px 32px', background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your Dedicated Agent</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{order.staff_name}</div>
            {order.staff_whatsapp && <div style={{ fontSize: 12, color: '#666' }}>WhatsApp: {order.staff_whatsapp}</div>}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '20px 32px', textAlign: 'center', background: '#fafafa' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Thank you for choosing Masterliqours!</div>
          <div style={{ fontSize: 11, color: '#bbb' }}>www.masterliqours.my · hello@masterliqours.my</div>
          <div style={{ fontSize: 10, color: '#ccc', marginTop: 8 }}>
            This is an electronic receipt. For queries, contact your agent or email us.
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; background: #fff !important; }
          .no-print { display: none !important; }
          div[style*="background: #030303"] { background: #030303 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
