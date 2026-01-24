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
  mountNavbar('inventory');
  init();
}

let inv = [];

async function init(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  await refresh();
}

async function refresh(){
  await Promise.allSettled([loadInventory(), loadPoints()]);
}

async function loadPoints(){
  const el = qs('#pointsChip');
  if (!el) return;
  try {
    const data = await api.get('/users/me/points', { auth: true });
    el.textContent = `${formatNumber(data.points ?? 0)} pts`;
  } catch {}
}

async function loadInventory(){
  const el = qs('#invGrid');
  if (!el) return;

  el.innerHTML = `<div class="text-muted">Loading inventory...</div>`;

  try {
    inv = await api.get('/inventory', { auth: true });

    if (!inv.length) {
      el.innerHTML = `<div class="text-muted">Your inventory is empty. Buy items in the shop to boost your next boss hit.</div>`;
      return;
    }

    el.innerHTML = `<div class="row g-3">${inv.map(renderRow).join('')}</div>`;
    qsa('[data-use]').forEach(b => b.addEventListener('click', useItem));
  } catch (err) {
    el.innerHTML = `<div class="text-muted">${escapeHtml(err?.message || 'Failed to load')}</div>`;
  }
}

function renderRow(it){
  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="wq-glass p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(it.name || 'Item')}</div>
            <div class="text-muted small">Item #${escapeHtml(it.item_id)}</div>
          </div>
          <span class="wq-badge">×${formatNumber(it.quantity || 0)}</span>
        </div>

        <div class="mt-2 text-muted small">
          Bonus damage: <span class="fw-semibold">${formatNumber(it.bonus_damage || 0)}</span><br>
          Multiplier: <span class="fw-semibold">×${formatNumber(it.multiplier || 1)}</span>
        </div>

        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-sm btn-primary" data-use="${it.item_id}">Use for next completion</button>
        </div>
      </div>
    </div>
  `;
}

async function useItem(e){
  const btn = e.currentTarget;
  const item_id = parseInt(btn.dataset.use, 10);

  try {
    setLoading(btn, true, 'Using...');
    const res = await api.post('/inventory/use', { item_id }, { auth: true });
    toast(`Applied bonus: +${formatNumber(res.bonus_damage)} damage, ×${formatNumber(res.multiplier)} multiplier.`, { kind: 'success', title: 'Effect applied' });
    await refresh();
  } catch (err) {
    toast(err?.message || 'Failed to use item.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
}
