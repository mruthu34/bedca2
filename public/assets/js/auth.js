import { ROUTES } from './config.js';
import { clearToken, getToken, setToken } from './storage.js';
import { api } from './api.js';

const FLASH_KEY = 'wq_flash';

export function setFlash(message, kind='warning'){
  localStorage.setItem(FLASH_KEY, JSON.stringify({ message, kind, ts: Date.now() }));
}

export function consumeFlash(){
  const raw = localStorage.getItem(FLASH_KEY);
  if (!raw) return null;
  localStorage.removeItem(FLASH_KEY);
  try { return JSON.parse(raw); } catch { return { message: String(raw), kind: 'info' }; }
}

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

export function isTokenExpired(token){
  const payload = parseJwt(token);
  const exp = payload?.exp;
  if (!exp) return false;
  // exp is in seconds
  return Date.now() >= (Number(exp) * 1000);
}


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

export function logout(){
  clearToken();
  window.location.href = ROUTES.home;
}

export async function login(username, password){
  const data = await api.post('/login', { username, password });
  if (data?.token) setToken(data.token);
  return data;
}

export async function register({ username, email, password }){
  const data = await api.post('/register', { username, email, password });
  if (data?.token) setToken(data.token);
  return data;
}
