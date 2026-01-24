import { mountNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { api } from '../api.js';
import { qs, toast, formatNumber } from '../ui.js';

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

async function init(){
  await Promise.allSettled([loadPoints(), loadBossSummary(), loadInventorySummary()]);
}

async function loadPoints(){
  const el = qs('#myPoints');
  if (!el) return;
  try {
    const data = await api.get('/users/me/points', { auth: true });
    el.textContent = formatNumber(data.points ?? 0);
  } catch (err) {
    toast(err?.message || 'Could not load points.', { kind: 'danger', title: 'Error' });
  }
}

async function loadBossSummary(){
  const el = qs('#bossSummary');
  if (!el) return;
  try {
    const boss = await api.get('/boss');
    const pct = boss.max_hp ? Math.max(0, Math.min(100, (boss.current_hp / boss.max_hp) * 100)) : 0;
    const displayName = getBossDisplayName(boss.name);
    const imgSrc = getBossImage(displayName);
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <div class="fw-semibold">${displayName}</div>
          <div class="text-muted small">HP ${formatNumber(boss.current_hp)} / ${formatNumber(boss.max_hp)}</div>
        </div>
        <a class="btn btn-sm btn-outline-light" href="/boss.html">Raid</a>
      </div>
      <div class="progress wq-progress" role="progressbar" aria-label="Boss HP">
        <div class="progress-bar" style="width: ${pct}%"></div>
      </div>
    `;
  } catch {
    el.innerHTML = `<div class="text-muted small">No active boss right now. Complete a challenge to summon one!</div>`;
  }
}

async function loadInventorySummary(){
  const el = qs('#invSummary');
  if (!el) return;
  try {
    const inv = await api.get('/inventory', { auth: true });
    const total = Array.isArray(inv) ? inv.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0) : 0;
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">Inventory</div>
          <div class="text-muted small">${formatNumber(total)} items owned</div>
        </div>
        <a class="btn btn-sm btn-outline-light" href="/inventory.html">Open</a>
      </div>
    `;
  } catch {
    el.innerHTML = `<div class="text-muted small">Sign in to view your inventory.</div>`;
  }
}
