import { mountNavbar } from '../components/navbar.js';
import { requireAuth, setFlash, consumeFlash } from '../auth.js';
import { api } from '../api.js';
import { qs, toast, setLoading, formatNumber } from '../ui.js';
import { clearToken } from '../storage.js';
import { ROUTES } from '../config.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });

if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('profile');
  init();
}

function init(){
  bindUi();
  refresh();
}

function bindUi(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  qs('#btnDeleteAccount')?.addEventListener('click', deleteAccount);
}

function refresh(){
  const btn = qs('#btnRefresh');
  setLoading(btn, true, 'Refreshing...');
  loadProfile()
    .finally(() => {
      setLoading(btn, false);
    });
}

function loadProfile(){
  return api.get('/users/me/profile', { auth: true })
    .then((data) => {
      const points = data.points ?? 0;

      const nameEl = qs('#profileName');
      if (nameEl) nameEl.textContent = data.username || '-';
      const pointsEl = qs('#profilePoints');
      if (pointsEl) pointsEl.textContent = `${formatNumber(points)} pts`;
      const chipEl = qs('#pointsChip');
      if (chipEl) chipEl.innerHTML = `<i class="bi bi-stars"></i>${formatNumber(points)} pts`;

      const dmgEl = qs('#statDamage');
      if (dmgEl) dmgEl.textContent = formatNumber(data.total_damage ?? 0);
      const spentEl = qs('#statSpent');
      if (spentEl) spentEl.textContent = formatNumber(data.total_points_spent ?? 0);
    })
    .catch((err) => {
      toast(err?.message || 'Failed to load profile.', { kind: 'danger', title: 'Error' });
    });
}

function deleteAccount(){
  const confirmed = window.confirm('Delete your account? This cannot be undone.');
  if (!confirmed) return;

  const btn = qs('#btnDeleteAccount');
  setLoading(btn, true, 'Deleting...');
  api.del('/users/me', { auth: true })
    .then(() => {
      setFlash('Your account was deleted.', 'success');
      clearToken();
      window.location.href = ROUTES.home;
    })
    .catch((err) => {
      toast(err?.message || 'Could not delete account.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}
