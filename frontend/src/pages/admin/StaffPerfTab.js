import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTrophy } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StaffPerfTab = () => {
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    axios.get(`${API}/admin/staff-performance`, { withCredentials: true })
      .then((r) => setPerf(r.data))
      .catch(() => setPerf({ staff: [], unassigned: { total_orders: 0, total_revenue: 0 } }));
  }, []);

  if (!perf) return <div className="surface p-10 text-center text-white/60">Loading staff stats...</div>;

  if (perf.staff.length === 0) {
    return (
      <div className="surface p-10 text-center" data-testid="admin-staff-perf-panel">
        <FaTrophy className="mx-auto text-[#ffd700] mb-4" size={32} />
        <div className="font-bold text-lg mb-2">No staff yet boss.</div>
        <div className="text-xs text-white/50">Add staff in Staff tab to see performance metrics here.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-staff-perf-panel">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="surface p-6" data-testid="perf-summary-team">
          <div className="eyebrow !mb-2">Team Size</div>
          <div className="display-lg text-[#00f0ff]" style={{ textShadow: '0 0 25px #00f0ff55' }}>{perf.staff.length}</div>
        </div>
        <div className="surface p-6" data-testid="perf-summary-orders">
          <div className="eyebrow !mb-2">Assigned Orders</div>
          <div className="display-lg text-[#39ff14]" style={{ textShadow: '0 0 25px #39ff1455' }}>
            {perf.staff.reduce((sum, s) => sum + s.total_orders, 0)}
          </div>
        </div>
        <div className="surface p-6" data-testid="perf-summary-unassigned">
          <div className="eyebrow !mb-2">Unassigned Orders</div>
          <div className="display-lg text-[#ffd700]" style={{ textShadow: '0 0 25px #ffd70055' }}>{perf.unassigned.total_orders}</div>
          <div className="text-xs text-white/40 mt-1">RM{perf.unassigned.total_revenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="surface p-6">
        <h2 className="display-md mb-5">Per-Staff Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-white/40 border-b border-white/10">
                <th className="pb-3 pr-4">Staff</th>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3 pr-4">Customers</th>
                <th className="pb-3 pr-4">Conversion</th>
                <th className="pb-3 pr-4">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {perf.staff.map((s) => (
                <tr key={s.staff_id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`perf-row-${s.staff_id}`}>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff007f] to-[#ffd700] flex items-center justify-center font-bold text-xs">
                        {s.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-bold">{s.name}</div>
                        <div className="text-xs text-white/40">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4"><code className="text-[#ffd700] text-xs">{s.referral_code}</code></td>
                  <td className="py-4 pr-4">
                    <div className="font-bold">{s.total_orders}</div>
                    <div className="text-[10px] text-white/40 flex gap-2 flex-wrap mt-1">
                      {Object.entries(s.by_status || {}).map(([k, v]) => (
                        <span key={k}>{k.slice(0, 4)}:{v.count}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 pr-4 font-display text-lg neon-pink-text">RM{s.total_revenue.toFixed(2)}</td>
                  <td className="py-4 pr-4">{s.customers_count}</td>
                  <td className="py-4 pr-4">
                    <span className={s.conversion_rate >= 50 ? 'text-[#39ff14]' : s.conversion_rate >= 20 ? 'text-[#ffd700]' : 'text-white/60'}>
                      {s.conversion_rate}%
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-xs text-white/50">
                    {s.last_order_at ? new Date(s.last_order_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffPerfTab;
