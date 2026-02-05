import { ROUTES } from './config.js';
import { clearToken, getToken, setToken, clearActivity } from './storage.js';
import { api } from './api.js';

// One-time banner message persisted across a redirect.
const FLASH_KEY = 'wq_flash';

// Store a transient message so the next page can display it.
export function setFlash(message, kind='warning'){
  localStorage.setItem(FLASH_KEY, JSON.stringify({ message, kind, ts: Date.now() }));
}

// Read and clear the flash message in a single call.
export function consumeFlash(){
  const raw = localStorage.getItem(FLASH_KEY);
  if (!raw) return null;
  localStorage.removeItem(FLASH_KEY);
  try { return JSON.parse(raw); } catch { return { message: String(raw), kind: 'info' }; }
}

// Decode JWT payload without validation (UI-only; server remains source of truth).
export function parseJwt(token){
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserIdFromToken(){
  const t = getToken();
  if (!t) return null;
  const payload = parseJwt(t);
  return payload?.userId ?? null;
}

// Client-side expiry check based on JWT exp (seconds).
export function isTokenExpired(token){
  const payload = parseJwt(token);
  const exp = payload?.exp;
  if (!exp) return false;
  // exp is in seconds
  return Date.now() >= (Number(exp) * 1000);
}


// Enforce auth in UI routes by redirecting to login if needed.
export function requireAuth(){
  const t = getToken();
  if (!t) {
    window.location.href = ROUTES.login;
    return false;
  }
  if (isTokenExpired(t)) {
    clearToken();
    setFlash('Session expired. Please log in again.', 'warning');
    window.location.href = ROUTES.login;
    return false;
  }
  return true;
}

// Clear local session state and return to home.
export function logout(){
  const userId = getUserIdFromToken();
  clearToken();
  clearActivity(userId);
  clearActivity();
  window.location.href = ROUTES.home;
}

export function login(username, password){
  return api.post('/login', { username, password }).then((data) => {
    if (data?.token) setToken(data.token);
    return data;
  });
}

export function register({ username, email, password }){
  return api.post('/register', { username, email, password }).then((data) => {
    if (data?.token) setToken(data.token);
    return data;
  });
}
