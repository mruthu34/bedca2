import { mountNavbar } from '../components/navbar.js';
import { requireAuth, getUserIdFromToken } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity } from '../storage.js';

import { consumeFlash } from '../auth.js';

// Show any one-time message from a redirect (e.g., logout/session expiry).
const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });


if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('shop');
  init();
}

let items = [];
let ownedMap = new Map();
let inventoryCapacity = 20;
let inventoryUsed = 0;

const INVENTORY_SLOT_PACK = 5;
const INVENTORY_SLOT_COST = 100;

function init(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  refresh();
}

// Load items + ownership + points + capacity in parallel.
function refresh(){
  Promise.allSettled([loadItems(), loadPoints(), loadOwned(), loadCapacity()]);
}

function loadPoints(){
  const el = qs('#pointsChip');
  const navEl = qs('#navPoints');
  if (!el && !navEl) return Promise.resolve();
  return api.get('/users/me/points', { auth: true })
    .then((data) => {
      const html = `<i class="bi bi-stars"></i>${formatNumber(data.points ?? 0)} pts`;
      if (el) el.innerHTML = html;
      if (navEl) navEl.innerHTML = html;
    })
    .catch(() => {});
}

function loadItems(){
  const el = qs('#itemGrid');
  if (!el) return Promise.resolve();
  el.innerHTML = `<div class="text-muted">Loading items...</div>`;

  return api.get('/shop/items')
    .then((rows) => {
      items = rows;
      if (!items.length) {
        el.innerHTML = `<div class="text-muted">No items found.</div>`;
        return;
      }
      renderItems();
    })
    .catch((err) => {
      el.innerHTML = `<div class="text-muted">${escapeHtml(err?.message || 'Failed to load')}</div>`;
    });
}

// Render shop cards once we have items + ownership info.
function renderItems(){
  const el = qs('#itemGrid');
  if (!el) return;
  el.innerHTML = `
    <div class="row g-3">
      ${renderCapacityCard()}
      ${items.map(renderItem).join('')}
    </div>
  `;
  qsa('[data-buy]').forEach(b => b.addEventListener('click', onBuy));
  qsa('[data-step]').forEach(b => b.addEventListener('click', onStep));
  qsa('[data-buy-capacity]').forEach(b => b.addEventListener('click', onBuyCapacity));
  qsa('[data-step-capacity]').forEach(b => b.addEventListener('click', onStepCapacity));
}

function loadOwned(){
  return api.get('/inventory', { auth: true })
    .then((inv) => {
      ownedMap = new Map((inv || []).map(row => [String(row.item_id), row.quantity || 0]));
      inventoryUsed = (inv || []).reduce((sum, row) => sum + (parseInt(row.quantity, 10) || 0), 0);
      if (items.length) renderItems();
    })
    .catch(() => {
      ownedMap = new Map();
    });
}

function loadCapacity(){
  return api.get('/users/me/profile', { auth: true })
    .then((data) => {
      inventoryCapacity = Number(data.inventory_capacity) || 20;
      if (items.length) renderItems();
    })
    .catch(() => {});
}

// Special card for buying inventory slots.
function renderCapacityCard(){
  const used = Number(inventoryUsed) || 0;
  const cap = Number(inventoryCapacity) || 20;
  const isFull = used >= cap;
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card-glass p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">Inventory Slots</div>
            <div class="text-muted small">Capacity upgrade</div>
          </div>
          <span class="wq-badge">${formatNumber(INVENTORY_SLOT_COST)} pts</span>
        </div>

        <div class="mt-3 text-muted small">
          Used: <span class="fw-semibold">${formatNumber(used)}</span> / ${formatNumber(cap)} items
          ${isFull ? `<span class="wq-badge ms-2">Full</span>` : ''}
        </div>
        <div class="text-muted small">Adds +${formatNumber(INVENTORY_SLOT_PACK)} slots per purchase.</div>

        <div class="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <div class="wq-stepper" data-stepper="capacity">
            <button type="button" data-step-capacity="down">-</button>
            <input class="form-control form-control-sm" type="number" min="1" value="1" id="qty_capacity" />
            <button type="button" data-step-capacity="up">+</button>
          </div>
          <button class="btn btn-sm btn-outline-light" data-buy-capacity="1"><i class="bi bi-bag-plus"></i>Buy slots</button>
        </div>
      </div>
    </div>
  `;
}

function renderItem(it){
  const ownedQty = ownedMap.get(String(it.item_id)) || 0;
  const imgSrc = getItemImage(it);
  const available = Math.max(0, (Number(inventoryCapacity) || 20) - (Number(inventoryUsed) || 0));
  const isFull = available <= 0;
  const diffMult = Number(it.difficulty_multiplier || 1);
  const diffLabel = diffMult > 1 ? `Boss scaling: <span class="fw-semibold">x${formatNumber(diffMult)}</span><br>` : '';
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card-glass p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(it.name)}</div>
            <div class="text-muted small">Item #${escapeHtml(it.item_id)}</div>
          </div>
          <span class="wq-badge">${formatNumber(it.cost_points)} pts</span>
        </div>

        <div class="d-flex align-items-center gap-3 mt-3">
          <div class="wq-item-thumb">
            <img src="${imgSrc}" alt="" loading="lazy">
          </div>
          <div class="text-muted small">
            Bonus damage: <span class="fw-semibold">${formatNumber(it.bonus_damage || 0)}</span><br>
            Multiplier: <span class="fw-semibold">x${formatNumber(it.multiplier || 1)}</span><br>
            ${diffLabel}
            <span class="text-muted">Owned: ${formatNumber(ownedQty)}</span>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <div class="wq-stepper" data-stepper="${it.item_id}">
            <button type="button" data-step="down" data-target="${it.item_id}" ${isFull ? 'disabled' : ''}>-</button>
            <input class="form-control form-control-sm" type="number" min="1" max="${available || 1}" value="1" id="qty_${it.item_id}" ${isFull ? 'disabled' : ''} />
            <button type="button" data-step="up" data-target="${it.item_id}" data-max="${available || 1}" ${isFull ? 'disabled' : ''}>+</button>
          </div>
          <button class="btn btn-sm btn-primary" data-buy="${it.item_id}" ${isFull ? 'disabled' : ''}><i class="bi bi-bag-plus"></i>Buy</button>
        </div>
      </div>
    </div>
  `;
}

// Buy a specific item with quantity from the stepper.
function onBuy(e){
  const btn = e.currentTarget;
  const item_id = parseInt(btn.dataset.buy, 10);
  const qty = parseInt(qs(`#qty_${item_id}`)?.value, 10) || 1;
  const available = Math.max(0, (Number(inventoryCapacity) || 20) - (Number(inventoryUsed) || 0));
  if (available <= 0 || qty > available) {
    toast('Inventory full. Buy more inventory in the shop.', { kind: 'warning', title: 'Inventory full' });
    return;
  }

  setLoading(btn, true, 'Buying...');
  api.post('/shop/buy', { item_id, qty }, { auth: true })
    .then((res) => {
      toast(`Purchased x${res.quantity} ${res.name}.`, { kind: 'success', title: 'Purchased' });
      addActivity({ title: 'Item purchased', detail: `x${res.quantity} ${res.name}`, icon: 'bag-plus' }, getUserIdFromToken());
      refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Purchase failed.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

// Stepper control for item quantities.
function onStep(e){
  const btn = e.currentTarget;
  const target = btn.dataset.target;
  const input = qs(`#qty_${target}`);
  if (!input) return;
  const current = parseInt(input.value, 10) || 1;
  const max = parseInt(btn.dataset.max || input.max, 10) || current + 1;
  const next = btn.dataset.step === 'up' ? Math.min(max, current + 1) : Math.max(1, current - 1);
  input.value = next;
}

// Buy inventory slot packs.
function onBuyCapacity(e){
  const btn = e.currentTarget;
  const qty = parseInt(qs('#qty_capacity')?.value, 10) || 1;

  setLoading(btn, true, 'Buying...');
  api.post('/shop/buy-capacity', { qty }, { auth: true })
    .then((res) => {
      toast(`Added ${formatNumber(res.slots_added)} slots.`, { kind: 'success', title: 'Inventory upgraded' });
      addActivity({ title: 'Inventory upgraded', detail: `+${formatNumber(res.slots_added)} slots`, icon: 'bag-plus' }, getUserIdFromToken());
      refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Purchase failed.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

// Stepper control for capacity pack quantity.
function onStepCapacity(e){
  const btn = e.currentTarget;
  const input = qs('#qty_capacity');
  if (!input) return;
  const current = parseInt(input.value, 10) || 1;
  const next = btn.dataset.stepCapacity === 'up' ? current + 1 : Math.max(1, current - 1);
  input.value = next;
}

// Simple name-based asset mapping for item thumbnails.
function getItemImage(it){
  const name = String(it.name || '').toLowerCase();
  if (name.includes('shield') || name.includes('guard')) return '/assets/img/items/shield.svg';
  if (name.includes('boost') || name.includes('power')) return '/assets/img/items/boost.svg';
  if (name.includes('spark') || name.includes('focus')) return '/assets/img/items/spark.svg';
  return '/assets/img/items/default.svg';
}
