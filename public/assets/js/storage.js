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

export function addActivity(entry){
  const list = getActivity();
  const payload = {
    title: entry?.title || 'Activity',
    detail: entry?.detail || '',
    icon: entry?.icon || 'sparkles',
    ts: Date.now()
  };
  list.unshift(payload);
  const trimmed = list.slice(0, 6);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function getActivity(){
  const raw = localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}

export function clearActivity(){
  localStorage.removeItem(ACTIVITY_KEY);
}
