import { mountNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity, getActiveEffect, setActiveEffect } from '../storage.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });


if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('inventory');
  init();
}

let inv = [];

function init(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  renderActiveEffect();
  refresh();
}

function refresh(){
  Promise.allSettled([loadInventory(), loadPoints()]).then(() => {
    renderActiveEffect();
  });
}

function loadPoints(){
  const el = qs('#pointsChip');
  if (!el) return Promise.resolve();
  return api.get('/users/me/points', { auth: true })
    .then((data) => {
      el.innerHTML = `<i class="bi bi-stars"></i>${formatNumber(data.points ?? 0)} pts`;
    })
    .catch(() => {});
}

function loadInventory(){
  const el = qs('#invGrid');
  if (!el) return Promise.resolve();

  el.innerHTML = `<div class="text-muted">Loading inventory...</div>`;

  return api.get('/inventory', { auth: true })
    .then((rows) => {
      inv = rows;

      if (!inv.length) {
        el.innerHTML = `<div class="text-muted">Your inventory is empty. Buy items in the shop to boost your next boss hit.</div>`;
        return;
      }

      el.innerHTML = `<div class="row g-3">${inv.map(renderRow).join('')}</div>`;
      qsa('[data-use]').forEach(b => b.addEventListener('click', useItem));
    })
    .catch((err) => {
      el.innerHTML = `<div class="text-muted">${escapeHtml(err?.message || 'Failed to load')}</div>`;
    });
}

function renderRow(it){
  const imgSrc = getItemImage(it);
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card-glass p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(it.name || 'Item')}</div>
            <div class="text-muted small">Item #${escapeHtml(it.item_id)}</div>
          </div>
          <span class="wq-badge">x${formatNumber(it.quantity || 0)}</span>
        </div>

        <div class="d-flex align-items-center gap-3 mt-3">
          <div class="wq-item-thumb">
            <img src="${imgSrc}" alt="" loading="lazy">
          </div>
          <div class="text-muted small">
            Bonus damage: <span class="fw-semibold">${formatNumber(it.bonus_damage || 0)}</span><br>
            Multiplier: <span class="fw-semibold">x${formatNumber(it.multiplier || 1)}</span>
          </div>
        </div>

        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-sm btn-primary" data-use="${it.item_id}"><i class="bi bi-lightning-charge"></i>Use for next completion</button>
        </div>
      </div>
    </div>
  `;
}

function useItem(e){
  const btn = e.currentTarget;
  const item_id = parseInt(btn.dataset.use, 10);
  const item = inv.find(row => String(row.item_id) === String(item_id));

  setLoading(btn, true, 'Using...');
  api.post('/inventory/use', { item_id }, { auth: true })
    .then((res) => {
      toast(`Applied bonus: +${formatNumber(res.bonus_damage)} damage, x${formatNumber(res.multiplier)} multiplier.`, { kind: 'success', title: 'Effect applied' });
      setActiveEffect({
        bonus_damage: res.bonus_damage,
        multiplier: res.multiplier,
        name: item?.name || 'Inventory item'
      });
      addActivity({ title: 'Item activated', detail: item?.name || `Item #${item_id}`, icon: 'lightning-charge' });
      refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Failed to use item.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function renderActiveEffect(){
  const el = qs('#activeEffectBanner');
  if (!el) return;
  const effect = getActiveEffect();
  if (!effect) {
    el.innerHTML = `
      <div class="wq-section-title mb-1"><i class="bi bi-lightning-charge"></i>Active Effect</div>
      <div class="text-muted small">No active item effect detected.</div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="wq-section-title mb-1"><i class="bi bi-lightning-charge"></i>Active Effect</div>
    <div class="fw-semibold">${escapeHtml(effect.name || 'Item effect')}</div>
    <div class="text-muted small">+${formatNumber(effect.bonus_damage || 0)} bonus damage, x${formatNumber(effect.multiplier || 1)} multiplier</div>
  `;
}

function getItemImage(it){
  const name = String(it.name || '').toLowerCase();
  if (name.includes('shield') || name.includes('guard')) return '/assets/img/items/shield.svg';
  if (name.includes('boost') || name.includes('power')) return '/assets/img/items/boost.svg';
  if (name.includes('spark') || name.includes('focus')) return '/assets/img/items/spark.svg';
  return '/assets/img/items/default.svg';
}
