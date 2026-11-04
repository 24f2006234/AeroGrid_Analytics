// Service URLs. Set VITE_API_URL / VITE_ML_URL at build time (e.g. in Vercel env vars).
const stripSlash = (url: string) => url.replace(/\/+$/, '');

export const API_URL = stripSlash(import.meta.env.VITE_API_URL || 'http://localhost:5000');
export const ML_URL = stripSlash(import.meta.env.VITE_ML_URL || 'http://localhost:8000');
