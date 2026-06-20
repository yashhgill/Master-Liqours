import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context';
import { subscribeStaffToPush } from '../lib/pwa';
import { FaChartLine, FaBox, FaUsers, FaBolt, FaExchangeAlt, FaKey, FaTimes } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TransferModal = ({ order, staffList, onClose, onTransferred }) => {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!targetId) { setErr('Pick a staff to transfer to.'); return; }
    setLoading(true);
    setErr('');
    try {
      await axios.post(`${API}/staff/orders/${order.order_id}/transfer`, { target_staff_id: targetId }, { withCredentials: true });
      onTransferred();
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="surface relative max-w-sm w-full p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
        <h3 className="display-md mb-1">Transfer Order</h3>
        <p className="text-white/50 text-xs mb-5">#{order.order_id.slice(0, 8)} — RM{order.total?.toFixed(2)}</p>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="input-dark mb-4">
          <option value="">Select staff...</option>
          {staffList.filter((s) => s.staff_id !== order.staff_id).map((s) => (
            <option key={s.staff_id} value={s.staff_id}>{s.name}</option>
          ))}
        </select>
        {err && <p className="text-[#ff007f] text-xs mb-3">{err}</p>}
        <button onClick={submit} disabled={loading} className="btn-lime w-full">{loading ? 'Transferring...' : 'Confirm Transfer'}</button>
      </div>
    </div>
  );
};

const ResetPasswordModal = ({ staff, onClose }) => {
  const [tempPw, setTempPw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const doReset = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await axios.post(`${API}/admin/staff/${staff.staff_id}/reset-password`, {}, { withCredentials: true });
      setTempPw(data.temp_password);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="surface relative max-w-sm w-full p-6 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><FaTimes /></button>
        <FaKey className="text-[#ffd700] text-3xl mx-auto mb-3" />
        <h3 className="display-md mb-1">Reset Password</h3>
        <p className="text-white/50 text-xs mb-5">For {staff.name} ({staff.email})</p>

        {tempPw ? (
          <div className="bg-[#0a0a0a] border border-[#39ff14]/30 rounded-2xl p-4 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">New temporary password — copy now, shown once</div>
            <div className="font-mono text-lg text-[#39ff14] break-all">{tempPw}</div>
          </div>
        ) : (
          <p className="text-white/60 text-sm mb-5">This generates a brand-new temporary password for this staff member. Their old password stops working immediately. Share the new one with them directly — it's a business of trust, so only do this if you're sure.</p>
        )}

        {err && <p className="text-[#ff007f] text-xs mb-3">{err}</p>}

        {!tempPw && (
          <button onClick={doReset} disabled={loading} className="btn-lime w-full">{loading ? 'Resetting...' : 'Generate New Password'}</button>
        )}
      </div>
    </div>
  );
};

const MasterAdminDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [transferTarget, setTransferTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [expandedStaff, setExpandedStaff] = useState(null);

  const loadAll = () => {
    Promise.all([
      axios.get(`${API}/admin/analytics`, { withCredentials: true }),
      axios.get(`${API}/admin/all-orders`, { withCredentials: true }),
      axios.get(`${API}/admin/staff`, { withCredentials: true }),
    ]).then(([a, o, s]) => { setAnalytics(a.data); setOrders(o.data); setStaffList(s.data); }).catch(() => {});
  };

  useEffect(() => { loadAll(); subscribeStaffToPush(); }, []);

  if (!analytics) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-white/60">Loading boss...</div>;

  const stats = [
    { label: 'Total Sales', val: `RM${(analytics.total_sales || 0).toFixed(2)}`, icon: FaChartLine, color: '#ff007f' },
    { label: 'Total Orders', val: analytics.total_orders || 0, icon: FaBox, color: '#00f0ff' },
    { label: 'Pending', val: analytics.pending_orders || 0, icon: FaUsers, color: '#ffd700' },
    { label: 'Flash Sales', val: analytics.active_flash_sales || 0, icon: FaBolt, color: '#39ff14' },
  ];

  const ordersByStaff = (staffId) => orders.filter((o) => o.staff_id === staffId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="eyebrow mb-3">Boss Console</div>
      <h1 className="display-xl mb-2">Welcome <span className="neon-pink-text">{user?.name}</span></h1>
      <p className="text-white/60 mb-10">Full system view — sales, staff, orders, all here.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="surface p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow !mb-0">{s.label}</div>
              <s.icon style={{ color: s.color }} />
            </div>
            <div className="display-lg" style={{ color: s.color, textShadow: `0 0 25px ${s.color}55` }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="surface p-6">
          <h2 className="display-md mb-5">Sales by Staff</h2>
          <div className="space-y-3">
            {(analytics.staff_sales || []).map((s, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-white/50">{s.orders || 0} orders</div>
                </div>
                <div className="font-display text-xl neon-pink-text">RM{(s.sales || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          <h2 className="display-md mb-5">Recent Orders</h2>
          <div className="space-y-3">
            {orders.slice(0, 8).map((o) => (
              <div key={o.order_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex justify-between">
                <div>
                  <div className="font-bold">#{o.order_id.slice(0, 8)}</div>
                  <div className="text-xs text-white/50">{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl neon-pink-text">RM{o.total.toFixed(2)}</div>
                  <span className={`text-[10px] uppercase font-bold ${
                    o.status === 'delivered' ? 'text-[#39ff14]' : o.status === 'cancelled' ? 'text-[#ff007f]' : 'text-[#ffd700]'
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Staff Control: view each staff's orders, transfer orders, reset passwords ── */}
      <div className="surface p-6">
        <h2 className="display-md mb-2">Staff Control</h2>
        <p className="text-white/50 text-sm mb-6">Full control — see what each staff is handling, move an order to someone else, or reset their login if needed.</p>

        <div className="space-y-3">
          {staffList.map((s) => {
            const staffOrders = ordersByStaff(s.staff_id);
            const isOpen = expandedStaff === s.staff_id;
            return (
              <div key={s.staff_id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <button onClick={() => setExpandedStaff(isOpen ? null : s.staff_id)} className="text-left flex-1">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-white/50">{s.email} · {staffOrders.length} orders</div>
                  </button>
                  <button onClick={() => setResetTarget(s)} className="btn-ghost border-white/40 text-white text-xs flex items-center gap-2 px-3 py-2">
                    <FaKey size={12} /> Reset Password
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                    {staffOrders.length === 0 && <p className="text-white/40 text-sm">No orders assigned yet.</p>}
                    {staffOrders.map((o) => (
                      <div key={o.order_id} className="flex items-center justify-between bg-black/30 rounded-xl p-3 text-sm">
                        <div>
                          <div className="font-bold">#{o.order_id.slice(0, 8)} — RM{o.total.toFixed(2)}</div>
                          <div className="text-xs text-white/40 uppercase">{o.status}</div>
                        </div>
                        {!['delivered', 'cancelled'].includes(o.status) && (
                          <button onClick={() => setTransferTarget(o)} className="btn-ghost border-white/30 text-white text-xs flex items-center gap-2 px-3 py-1.5">
                            <FaExchangeAlt size={11} /> Transfer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {staffList.length === 0 && <p className="text-white/40 text-sm">No staff yet — create staff accounts first.</p>}
        </div>
      </div>

      {transferTarget && (
        <TransferModal
          order={transferTarget}
          staffList={staffList}
          onClose={() => setTransferTarget(null)}
          onTransferred={loadAll}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal staff={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
};

export default MasterAdminDashboard;
