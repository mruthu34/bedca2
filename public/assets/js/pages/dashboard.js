import { mountNavbar } from '../components/navbar.js';
import { requireAuth, getUserIdFromToken } from '../auth.js';
import { api } from '../api.js';
import { qs, toast, formatNumber } from '../ui.js';
import { getActiveEffect, getActivity } from '../storage.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });

const bossImages = {
  "Stress Dragon": "https://static.wikia.nocookie.net/dragoncity/images/0/0a/Stressed_Dragon_1.png/revision/latest?cb=20250528062816",
  "Burnout Titan": "/assets/img/bosses/burnout-titan.webp",
  "Anxiety Kraken": "/assets/img/bosses/anxiety-kraken.webp",
  "Procrastination Phantom": "/assets/img/bosses/procrastination-phantom.webp",
  "Deadline Demon": "/assets/img/bosses/deadline-demon.webp",
  "Caffeine Golem": "/assets/img/bosses/caffeine-golem.webp",
  "Mind Fog Colossus": "/assets/img/bosses/mind-fog-colossus.webp",
  "Overcommitment Hydra": "/assets/img/bosses/overcommitment-hydra.webp",
  "Meeting Minotaur": "/assets/img/bosses/meeting-minotaur.webp",
  "Inbox Wraith": "/assets/img/bosses/inbox-wraith.webp",
  "Focus Lord": "/assets/img/bosses/focus-lord.webp",
  "Focus Leech": "/assets/img/bosses/focus-lord.webp",
  "Perfectionism Cyclops": "/assets/img/bosses/perfectionism-cyclops.webp"
};

function getBossImage(name){
  return bossImages[name] || "/assets/img/bosses/default.webp";
}

function getBossDisplayName(name){
  return name === "Focus Leech" ? "Focus Lord" : name;
}


if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('dashboard');
  init();
}

function init(){
  renderActivity();
  renderActiveEffect();
  bindRefreshSignals();
  Promise.allSettled([loadPoints(), loadBossSummary(), loadInventorySummary()]);
}

function bindRefreshSignals(){
  window.addEventListener('pageshow', () => loadBossSummary());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadBossSummary();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'bossUpdateAt') loadBossSummary();
  });
  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel('boss_updates');
    bc.addEventListener('message', (e) => {
      if (e?.data?.type === 'bossUpdate') loadBossSummary();
    });
    window.addEventListener('beforeunload', () => bc.close(), { once: true });
  }
}

function loadPoints(){
  const el = qs('#myPoints');
  if (!el) return;
  return api.get('/users/me/points', { auth: true })
    .then((data) => {
      el.textContent = formatNumber(data.points ?? 0);
    })
    .catch((err) => {
      toast(err?.message || 'Could not load points.', { kind: 'danger', title: 'Error' });
    });
}

function loadBossSummary(){
  const el = qs('#bossSummary');
  if (!el) return;
  return api.get('/boss')
    .then((boss) => {
      const pct = boss.max_hp ? Math.max(0, Math.min(100, (boss.current_hp / boss.max_hp) * 100)) : 0;
      const displayName = getBossDisplayName(boss.name);
      const imgSrc = getBossImage(displayName);
      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <div class="fw-semibold">${displayName}</div>
            <div class="text-muted small">HP ${formatNumber(boss.current_hp)} / ${formatNumber(boss.max_hp)}</div>
          </div>
          <a class="btn btn-sm btn-outline-light" href="/boss.html"><i class="bi bi-crosshair"></i>Raid</a>
        </div>
        <div class="progress wq-progress" role="progressbar" aria-label="Boss HP">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
      `;
    })
    .catch(() => {
      el.innerHTML = `<div class="text-muted small">No active boss right now. Complete a challenge to summon one!</div>`;
    });
}

function loadInventorySummary(){
  const el = qs('#invSummary');
  if (!el) return;
  return api.get('/inventory', { auth: true })
    .then((inv) => {
      const total = Array.isArray(inv) ? inv.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0) : 0;
      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">Inventory</div>
            <div class="text-muted small">${formatNumber(total)} items owned</div>
          </div>
          <a class="btn btn-sm btn-outline-light" href="/inventory.html"><i class="bi bi-backpack"></i>Open</a>
        </div>
      `;
    })
    .catch(() => {
      el.innerHTML = `<div class="text-muted small">Sign in to view your inventory.</div>`;
    });
}

function renderActiveEffect(){
  const el = qs('#activeEffectSummary');
  if (!el) return;
  const effect = getActiveEffect(getUserIdFromToken());
  if (!effect) {
    el.textContent = 'No active item effect detected.';
    return;
  }
  el.innerHTML = `
    <div class="fw-semibold">${effect.name || 'Item effect'}</div>
    <div class="text-muted small">+${formatNumber(effect.bonus_damage || 0)} bonus damage, x${formatNumber(effect.multiplier || 1)} multiplier</div>
  `;
}

function renderActivity(){
  const el = qs('#recentActivity');
  if (!el) return;
  const rows = getActivity();
  if (!rows.length) {
    el.innerHTML = `<div class="text-muted small">No activity yet. Complete a challenge or hit the boss.</div>`;
    return;
  }
  el.innerHTML = rows.map(r => `
    <div class="wq-activity-item">
      <span class="dot"></span>
      <div>
        <div class="fw-semibold">${r.title}</div>
        <div class="text-muted small">${r.detail || ''}</div>
      </div>
    </div>
  `).join('');
}
