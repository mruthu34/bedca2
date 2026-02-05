// Keep small client-side state in localStorage for simple UX.
const TOKEN_KEY = 'wq_token';
const EFFECT_KEY = 'wq_active_effect';
const ACTIVITY_KEY = 'wq_activity';

export function setToken(token){
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(){
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(){
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed(){
  return Boolean(getToken());
}

// Store a single active effect (optionally per-user).
export function setActiveEffect(effect, userId){
  if (!effect) return;
  const key = userId ? `${EFFECT_KEY}_${userId}` : EFFECT_KEY;
  const payload = {
    bonus_damage: Number(effect.bonus_damage) || 0,
    multiplier: Number(effect.multiplier) || 1,
    name: effect.name || effect.item_name || 'Item effect',
    ts: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function getActiveEffect(userId){
  const key = userId ? `${EFFECT_KEY}_${userId}` : EFFECT_KEY;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearActiveEffect(userId){
  const key = userId ? `${EFFECT_KEY}_${userId}` : EFFECT_KEY;
  localStorage.removeItem(key);
}

// Store a short rolling activity list for the dashboard.
export function addActivity(entry, userId){
  const list = getActivity(userId);
  const payload = {
    title: entry?.title || 'Activity',
    detail: entry?.detail || '',
    icon: entry?.icon || 'sparkles',
    ts: Date.now()
  };
  list.unshift(payload);
  // Cap history to avoid unbounded growth.
  const trimmed = list.slice(0, 6);
  const key = userId ? `${ACTIVITY_KEY}_${userId}` : ACTIVITY_KEY;
  localStorage.setItem(key, JSON.stringify(trimmed));
  return trimmed;
}

export function getActivity(userId){
  const key = userId ? `${ACTIVITY_KEY}_${userId}` : ACTIVITY_KEY;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

export function clearActivity(userId){
  const key = userId ? `${ACTIVITY_KEY}_${userId}` : ACTIVITY_KEY;
  localStorage.removeItem(key);
}
