/**
 * Lightweight toast notifications.
 *
 * Deliberately imperative — `toast('Saved')` is a drop-in replacement for
 * `alert('Saved')`, so call sites don't need restructuring. Renders into its
 * own container appended to <body>, so it works from anywhere (including
 * outside React render trees).
 *
 *   toast('Product saved')            → neutral/success
 *   toast('Save failed', 'error')     → red
 *   toast('Heads up', 'warn')         → gold
 */

const CONTAINER_ID = 'ml-toast-root';

const STYLES = {
  success: { bg: 'rgba(57,255,20,0.12)', border: 'rgba(57,255,20,0.45)', fg: '#39ff14', icon: '✓' },
  error:   { bg: 'rgba(255,0,127,0.12)', border: 'rgba(255,0,127,0.5)',  fg: '#ff007f', icon: '✕' },
  warn:    { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.45)', fg: '#ffd700', icon: '!' },
};

function ensureContainer() {
  let el = document.getElementById(CONTAINER_ID);
  if (el) return el;

  el = document.createElement('div');
  el.id = CONTAINER_ID;
  Object.assign(el.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '99999',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'none',
    maxWidth: 'min(380px, calc(100vw - 40px))',
  });
  document.body.appendChild(el);

  // Keyframes are injected once alongside the container.
  if (!document.getElementById('ml-toast-style')) {
    const style = document.createElement('style');
    style.id = 'ml-toast-style';
    style.textContent = `
      @keyframes mlToastIn  { from { opacity:0; transform: translateX(24px) } to { opacity:1; transform:none } }
      @keyframes mlToastOut { from { opacity:1; transform:none } to { opacity:0; transform: translateX(24px) } }
    `;
    document.head.appendChild(style);
  }
  return el;
}

export function toast(message, type = 'success', duration = 3600) {
  if (message === undefined || message === null || message === '') return;

  // Guard against non-DOM environments (SSR, tests).
  if (typeof document === 'undefined') return;

  const theme = STYLES[type] || STYLES.success;
  const root = ensureContainer();

  const item = document.createElement('div');
  Object.assign(item.style, {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: '#0d0d0d',
    backgroundImage: `linear-gradient(${theme.bg}, ${theme.bg})`,
    border: `1px solid ${theme.border}`,
    borderRadius: '14px',
    padding: '13px 16px',
    color: '#fff',
    fontSize: '13.5px',
    lineHeight: '1.5',
    fontWeight: '600',
    boxShadow: '0 8px 30px rgba(0,0,0,0.55)',
    animation: 'mlToastIn 0.22s ease-out',
    pointerEvents: 'auto',
    cursor: 'pointer',
    wordBreak: 'break-word',
  });

  const badge = document.createElement('span');
  Object.assign(badge.style, {
    color: theme.fg,
    fontWeight: '800',
    flexShrink: '0',
    fontSize: '14px',
    lineHeight: '1.4',
  });
  badge.textContent = theme.icon;

  const text = document.createElement('span');
  text.textContent = String(message);

  item.appendChild(badge);
  item.appendChild(text);
  root.appendChild(item);

  let removed = false;
  const dismiss = () => {
    if (removed) return;
    removed = true;
    item.style.animation = 'mlToastOut 0.2s ease-in forwards';
    setTimeout(() => item.remove(), 200);
  };

  item.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

export default toast;
