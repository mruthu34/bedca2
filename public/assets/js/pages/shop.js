import { mountNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';

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

async function init(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  await refresh();
}

async function refresh(){
  await Promise.allSettled([loadItems(), loadPoints()]);
}

async function loadPoints(){
  const el = qs('#pointsChip');
  if (!el) return;
  try {
    const data = await api.get('/users/me/points', { auth: true });
    el.textContent = `${formatNumber(data.points ?? 0)} pts`;
  } catch {}
}

async function loadItems(){
  const el = qs('#itemGrid');
  if (!el) return;
  el.innerHTML = `<div class="text-muted">Loading items...</div>`;

  try {
    items = await api.get('/shop/items');
    if (!items.length) {
      el.innerHTML = `<div class="text-muted">No items found.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="row g-3">
        ${items.map(renderItem).join('')}
      </div>
    `;

    qsa('[data-buy]').forEach(b => b.addEventListener('click', onBuy));
  } catch (err) {
    el.innerHTML = `<div class="text-muted">${escapeHtml(err?.message || 'Failed to load')}</div>`;
  }
}

function renderItem(it){
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="wq-glass p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(it.name)}</div>
            <div class="text-muted small">Item #${escapeHtml(it.item_id)}</div>
          </div>
          <span class="wq-badge">${formatNumber(it.cost_points)} pts</span>
        </div>

        <div class="mt-2 text-muted small">
          Bonus damage: <span class="fw-semibold">${formatNumber(it.bonus_damage || 0)}</span><br>
          Multiplier: <span class="fw-semibold">×${formatNumber(it.multiplier || 1)}</span>
        </div>

        <div class="d-flex gap-2 mt-3">
          <input class="form-control form-control-sm" style="max-width:110px" type="number" min="1" value="1" id="qty_${it.item_id}" />
          <button class="btn btn-sm btn-primary" data-buy="${it.item_id}">Buy</button>
        </div>
      </div>
    </div>
  `;
}

async function onBuy(e){
  const btn = e.currentTarget;
  const item_id = parseInt(btn.dataset.buy, 10);
  const qty = parseInt(qs(`#qty_${item_id}`)?.value, 10) || 1;

  try {
    setLoading(btn, true, 'Buying...');
    const res = await api.post('/shop/buy', { item_id, qty }, { auth: true });
    toast(`Purchased ×${res.quantity} ${res.name}.`, { kind: 'success', title: 'Purchased' });
    await refresh();
  } catch (err) {
    toast(err?.message || 'Purchase failed.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
}
