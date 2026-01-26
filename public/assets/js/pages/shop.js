import { mountNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity } from '../storage.js';

import { consumeFlash } from '../auth.js';

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

function init(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  refresh();
}

function refresh(){
  Promise.allSettled([loadItems(), loadPoints(), loadOwned()]);
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

function renderItems(){
  const el = qs('#itemGrid');
  if (!el) return;
  el.innerHTML = `
    <div class="row g-3">
      ${items.map(renderItem).join('')}
    </div>
  `;
  qsa('[data-buy]').forEach(b => b.addEventListener('click', onBuy));
  qsa('[data-step]').forEach(b => b.addEventListener('click', onStep));
}

function loadOwned(){
  return api.get('/inventory', { auth: true })
    .then((inv) => {
      ownedMap = new Map((inv || []).map(row => [String(row.item_id), row.quantity || 0]));
      if (items.length) renderItems();
    })
    .catch(() => {
      ownedMap = new Map();
    });
}

function renderItem(it){
  const ownedQty = ownedMap.get(String(it.item_id)) || 0;
  const imgSrc = getItemImage(it);
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
            <span class="text-muted">Owned: ${formatNumber(ownedQty)}</span>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <div class="wq-stepper" data-stepper="${it.item_id}">
            <button type="button" data-step="down" data-target="${it.item_id}">-</button>
            <input class="form-control form-control-sm" type="number" min="1" value="1" id="qty_${it.item_id}" />
            <button type="button" data-step="up" data-target="${it.item_id}">+</button>
          </div>
          <button class="btn btn-sm btn-primary" data-buy="${it.item_id}"><i class="bi bi-bag-plus"></i>Buy</button>
        </div>
      </div>
    </div>
  `;
}

function onBuy(e){
  const btn = e.currentTarget;
  const item_id = parseInt(btn.dataset.buy, 10);
  const qty = parseInt(qs(`#qty_${item_id}`)?.value, 10) || 1;

  setLoading(btn, true, 'Buying...');
  api.post('/shop/buy', { item_id, qty }, { auth: true })
    .then((res) => {
      toast(`Purchased x${res.quantity} ${res.name}.`, { kind: 'success', title: 'Purchased' });
      addActivity({ title: 'Item purchased', detail: `x${res.quantity} ${res.name}`, icon: 'bag-plus' });
      refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Purchase failed.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function onStep(e){
  const btn = e.currentTarget;
  const target = btn.dataset.target;
  const input = qs(`#qty_${target}`);
  if (!input) return;
  const current = parseInt(input.value, 10) || 1;
  const next = btn.dataset.step === 'up' ? current + 1 : Math.max(1, current - 1);
  input.value = next;
}

function getItemImage(it){
  const name = String(it.name || '').toLowerCase();
  if (name.includes('shield') || name.includes('guard')) return '/assets/img/items/shield.svg';
  if (name.includes('boost') || name.includes('power')) return '/assets/img/items/boost.svg';
  if (name.includes('spark') || name.includes('focus')) return '/assets/img/items/spark.svg';
  return '/assets/img/items/default.svg';
}
