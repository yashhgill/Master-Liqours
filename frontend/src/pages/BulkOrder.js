import React, { useState } from 'react';
import axios from 'axios';
import { FaWhatsapp, FaCheckCircle, FaWineGlass } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Field = ({ label, type = 'text', value, placeholder, onChange, required, rows }) => (
  <div>
    <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">
      {label} {required && <span className="text-[#ff007f]">*</span>}
    </label>
    {rows ? (
      <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} className="input-dark resize-none" />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="input-dark" />
    )}
  </div>
);

const BulkOrder = () => {
  const [form, setForm] = useState({
    name: '', company: '', email: '', whatsapp: '',
    event_date: '', estimated_cartons: '', items_wanted: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.whatsapp) {
      setError('Name, email and WhatsApp number are required lah.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/bulk-orders`, form);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Something went wrong — try again or WhatsApp us directly.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <FaCheckCircle className="text-[#39ff14] text-5xl mx-auto mb-6" />
        <h1 className="display-lg mb-3">Enquiry sent!</h1>
        <p className="text-white/60">We'll WhatsApp or email you shortly with carton/bulk pricing for your event.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.4em",textTransform:"uppercase",color:"rgba(255,215,0,0.7)",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:20,height:1,background:"#ffd700",display:"inline-block"}} /> Bulk & Event Orders
      </div>
      <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(40px,6vw,70px)",letterSpacing:"0.02em",lineHeight:0.95,marginBottom:16}}>
        Planning a party,<br/>wedding or <span style={{color:"#ff007f",textShadow:"0 0 30px rgba(255,0,127,0.4)"}}>event?</span>
      </h1>
      <p className="text-white/60 mb-10">
        Tell us what you need by the carton and we'll send you bulk pricing — usually cheaper per bottle than
        buying individually. Fill this in and our team will follow up on WhatsApp or email.
      </p>

      <form onSubmit={submit} className="surface p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Your Name" value={form.name} onChange={set('name')} required placeholder="John Tan" />
          <Field label="Company / Organizer (optional)" value={form.company} onChange={set('company')} placeholder="ABC Events Sdn Bhd" />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} required placeholder="you@email.com" />
          <Field label="WhatsApp Number" value={form.whatsapp} onChange={set('whatsapp')} required placeholder="012-3456789" />
          <Field label="Event Date (optional)" type="date" value={form.event_date} onChange={set('event_date')} />
          <Field label="Estimated Cartons Needed" value={form.estimated_cartons} onChange={set('estimated_cartons')} placeholder="e.g. 10 cartons mixed" />
        </div>
        <Field label="Items Wanted" value={form.items_wanted} onChange={set('items_wanted')} rows={3} placeholder="e.g. 5 cartons Jameson 700ml, 3 cartons Smirnoff Red 1L..." />
        <Field label="Anything else we should know?" value={form.message} onChange={set('message')} rows={3} placeholder="Delivery location, budget, theme, etc." />

        {error && <p className="text-[#ff007f] text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-lime w-full sm:w-auto">
          {loading ? 'Sending...' : 'Get Bulk Pricing'}
        </button>
      </form>

      <div className="mt-8 text-center text-white/50 text-sm flex items-center justify-center gap-2">
        <FaWhatsapp className="text-[#39ff14]" /> Prefer WhatsApp? Message any of our staff directly for a faster reply.
      </div>
    </div>
  );
};

export default BulkOrder;
