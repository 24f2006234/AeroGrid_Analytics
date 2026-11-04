// Backend base URL. Default '' = same origin, which is what Vercel Services uses
// (/api/* is routed to the backend service). Locally, `npm run dev` proxies /api to
// http://localhost:5000 (see vite.config.ts). Set VITE_API_URL only when the backend
// lives on a different domain (e.g. Render).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
