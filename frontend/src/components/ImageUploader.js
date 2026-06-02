import React, { useRef, useState } from 'react';
import axios from 'axios';
import { FaUpload, FaTimes, FaSpinner, FaImage } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND = process.env.REACT_APP_BACKEND_URL;

/**
 * Drag & drop image uploader.
 * - Pass `value` (current URL — relative `/api/uploads/...` or absolute http(s) URL)
 * - `onChange(url)` is called with the new URL after upload, or empty string when cleared.
 * - `label` and `aspect` ('square' | '16/9' | '4/5') tune the preview frame.
 */
const ImageUploader = ({ value = '', onChange, label = 'Image', aspect = '16/9', testid }) => {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/admin/upload`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(res.data.url);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Upload failed lah');
    } finally { setBusy(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const fullUrl = value ? (value.startsWith('http') ? value : `${BACKEND}${value}`) : '';
  const aspectClass = aspect === 'square' ? 'aspect-square' : aspect === '4/5' ? 'aspect-[4/5]' : 'aspect-[16/9]';

  return (
    <div className="w-full">
      {label && <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">{label}</label>}
      <div
        className={`relative ${aspectClass} rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
          drag ? 'border-[#39ff14] bg-[#39ff14]/5' : value ? 'border-white/15' : 'border-white/15 hover:border-[#ff007f]/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        data-testid={testid || 'img-uploader'}
      >
        {fullUrl ? (
          <>
            <img src={fullUrl} alt="" className="w-full h-full object-cover bg-white" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 hover:bg-[#ff007f] text-white flex items-center justify-center"
              data-testid={testid ? `${testid}-clear` : 'img-clear'}
            >
              <FaTimes size={12} />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#ff007f] text-white text-[10px] uppercase tracking-wider font-bold"
            >
              Replace
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/50 hover:text-[#ff007f] transition-colors px-6"
            data-testid={testid ? `${testid}-trigger` : 'img-trigger'}
          >
            {busy ? <FaSpinner className="animate-spin" size={28} /> : <FaImage size={28} />}
            <div className="text-center">
              <div className="font-bold uppercase tracking-wider text-sm">{busy ? 'Uploading...' : 'Drop image here'}</div>
              <div className="text-xs text-white/40 mt-1">or click to browse · PNG, JPG, WEBP, SVG up to 8MB</div>
            </div>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {err && <div className="text-[#ff007f] text-xs mt-2">{err}</div>}
      {value && (
        <div className="text-[10px] text-white/30 mt-2 truncate font-mono" title={value}>{value}</div>
      )}
    </div>
  );
};

export default ImageUploader;
