import React, { useRef, useState } from 'react';
import axios from 'axios';
import { FaUpload, FaTimes, FaSpinner, FaImage, FaCheck } from 'react-icons/fa';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BACKEND = process.env.REACT_APP_BACKEND_URL;

/**
 * Drag & drop image uploader.
 * Strategy:
 *   1. Ask backend for a presigned R2 URL (/admin/presign)
 *   2. PUT the file directly to R2 from the browser — no backend proxy
 *   3. Pass the permanent R2 public URL to onChange()
 * Falls back to the old /admin/upload proxy if presign fails (e.g. R2 not configured).
 */
const ImageUploader = ({ value = '', onChange, label = 'Image', aspect = '16/9', testid }) => {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');
  const [storage, setStorage] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true); setProgress(0); setStorage('');

    try {
      // Step 1: Try to get a presigned URL from the backend
      let publicUrl = null;

      try {
        const presignRes = await axios.get(`${API}/admin/presign`, {
          params: { filename: file.name },
          withCredentials: true,
        });

        const { upload_url, public_url } = presignRes.data;

        // Step 2: PUT directly to R2 — no size limit via backend
        await axios.put(upload_url, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          withCredentials: false, // R2 presigned URL — no cookies
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });

        publicUrl = public_url;
        setStorage('r2');
      } catch (presignErr) {
        // Presign not available — fall back to backend proxy upload
        console.warn('Presign failed, using proxy upload:', presignErr.message);
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/admin/upload`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });
        publicUrl = res.data.url;
        setStorage(res.data.storage || 'local');
      }

      setProgress(100);
      onChange(publicUrl);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Upload failed lah');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const fullUrl = value
    ? (value.startsWith('http') ? value : `${BACKEND}${value}`)
    : '';

  const aspectClass =
    aspect === 'square' ? 'aspect-square' :
    aspect === '4/5' ? 'aspect-[4/5]' :
    'aspect-[16/9]';

  return (
    <div className="w-full">
      {label && (
        <label className="text-xs uppercase tracking-[0.2em] text-white/50 block mb-2">{label}</label>
      )}
      <div
        className={`relative ${aspectClass} rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
          drag ? 'border-[#39ff14] bg-[#39ff14]/5' :
          value ? 'border-white/15' :
          'border-white/15 hover:border-[#ff007f]/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        data-testid={testid || 'img-uploader'}
      >
        {fullUrl ? (
          <>
            <img src={fullUrl} alt="" className="w-full h-full object-cover bg-white" />

            {/* Storage badge */}
            {storage && (
              <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                storage === 'r2' ? 'bg-[#39ff14] text-black' : 'bg-[#ffd700] text-black'
              }`}>
                <FaCheck size={8} />
                {storage === 'r2' ? 'Saved to R2' : 'Local (temp)'}
              </div>
            )}

            <button
              type="button"
              onClick={() => { onChange(''); setStorage(''); }}
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
            {busy ? (
              <>
                <FaSpinner className="animate-spin" size={28} />
                <div className="text-center">
                  <div className="font-bold uppercase tracking-wider text-sm">Uploading... {progress}%</div>
                  <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#39ff14] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <FaImage size={28} />
                <div className="text-center">
                  <div className="font-bold uppercase tracking-wider text-sm">Drop image here</div>
                  <div className="text-xs text-white/40 mt-1">or click to browse · PNG, JPG, WEBP up to 8MB</div>
                  <div className="text-xs text-[#39ff14]/60 mt-1">Uploads directly to Cloudflare R2</div>
                </div>
              </>
            )}
          </button>
        )}

        {/* Progress bar overlay while uploading */}
        {busy && value && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-[#39ff14] transition-all" style={{ width: `${progress}%` }} />
          </div>
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
        <div className="text-[10px] mt-2 truncate font-mono flex items-center gap-1" title={value}>
          {value.startsWith('https://pub-') || value.includes('r2.dev') ? (
            <span className="text-[#39ff14]">✓ R2:</span>
          ) : (
            <span className="text-[#ffd700]">⚠ Local:</span>
          )}
          <span className="text-white/30">{value}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
