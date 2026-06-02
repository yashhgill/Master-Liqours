const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

/** Resolve a possibly-relative image URL (e.g. `/api/uploads/x.png`) to absolute. */
export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${BACKEND}${url}`;
  return url;
};
