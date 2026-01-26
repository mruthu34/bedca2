import { API_BASE } from './config.js';
import { getToken, clearToken } from './storage.js';
import { setFlash } from './auth.js';
import { ROUTES } from './config.js';

function parseJsonSafe(res) {
  return res.text().then((text) => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  });
}

function buildError(status, data) {
  const message = (data && (data.message || data.error)) || `Request failed (HTTP ${status})`;
  return { status, message, data };
}


function handleAuthFailure(data){
  // Clear token and redirect to login with a friendly message
  clearToken();
  const msg = (data && (data.message || data.error)) || 'Your session has expired. Please log in again.';
  setFlash(msg, 'warning');
  const here = window.location.pathname;
  const onAuthPage = here.endsWith('/login.html') || here.endsWith('/register.html') || here === '/' || here.endsWith('/index.html');
  if (!onAuthPage) window.location.href = ROUTES.login;
}

export function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  let payload;

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload
  }).then((res) =>
    parseJsonSafe(res).then((data) => {
      if (!res.ok) {
        if (auth && res.status === 401) {
          handleAuthFailure(data);
        }
        throw buildError(res.status, data);
      }
      return data;
    })
  );
}

export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' })
};
