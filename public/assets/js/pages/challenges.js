import { mountNavbar } from '../components/navbar.js';
import { requireAuth, getUserIdFromToken } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity, clearActiveEffect, getActiveEffect } from '../storage.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });


if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('challenges');
  init();
}

let myUserId = getUserIdFromToken();
let challenges = [];
let editChallengeId = null;
const filters = { query: '', ownership: 'all', sort: 'newest' };

function init(){
  bindUi();
  refresh();
}

function bindUi(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  qs('#btnOpenCreate')?.addEventListener('click', () => openEditModal(null));
  qs('#formChallenge')?.addEventListener('submit', submitChallenge);
  qs('#formComplete')?.addEventListener('submit', submitCompletion);
  qs('#challengeSearch')?.addEventListener('input', onFilterChange);
  qs('#challengeFilter')?.addEventListener('change', onFilterChange);
  qs('#challengeSort')?.addEventListener('change', onFilterChange);
}

function refresh(){
  const list = qs('#challengeList');
  if (!list) return Promise.resolve();
  list.innerHTML = `<div class="text-muted">Loading challenges...</div>`;
  return api.get('/challenges')
    .then((rows) => {
      challenges = rows;
      renderList();
      return updatePointsChip();
    })
    .catch((err) => {
      toast(err?.message || 'Could not load challenges.', { kind: 'danger', title: 'Error' });
      list.innerHTML = `<div class="text-muted">Failed to load.</div>`;
    });
}

function renderList(){
  const list = qs('#challengeList');
  if (!list) return;

  const filtered = applyFilters();
  if (!Array.isArray(filtered) || filtered.length === 0) {
    list.innerHTML = challenges.length
      ? `<div class="text-muted">No matches. Try clearing your filters.</div>`
      : `<div class="text-muted">No challenges yet. Create your first one!</div>`;
    return;
  }

  list.innerHTML = filtered.map((c) => {
    const isOwner = (myUserId != null) && String(c.creator_id) === String(myUserId);
    return `
      <div class="col-12 col-lg-6">
        <div class="card-glass p-3 h-100">
          <div class="d-flex justify-content-between gap-3">
            <div>
              <div class="fw-semibold">Challenge #${escapeHtml(c.challenge_id)}</div>
              <div class="text-muted small">Creator ID: ${escapeHtml(c.creator_id)}</div>
            </div>
            <div class="d-flex flex-wrap gap-2 justify-content-end">
              ${isOwner ? `<span class="wq-badge"><i class="bi bi-person-check"></i>Mine</span>` : ''}
              <span class="wq-badge"><i class="bi bi-gift"></i>+${escapeHtml(c.points)} pts</span>
            </div>
          </div>

          <div class="mt-3">${escapeHtml(c.description)}</div>

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-sm btn-primary" data-action="complete" data-id="${c.challenge_id}"><i class="bi bi-check2-circle"></i>Complete</button>
            <button class="btn btn-sm btn-outline-light" data-action="viewAttempts" data-id="${c.challenge_id}"><i class="bi bi-journal-text"></i>Attempts</button>
            ${isOwner ? `
              <button class="btn btn-sm btn-outline-light" data-action="edit" data-id="${c.challenge_id}"><i class="bi bi-pencil"></i>Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${c.challenge_id}"><i class="bi bi-trash"></i>Delete</button>
            ` : `<span class="text-muted small align-self-center">You can only edit/delete your own challenges.</span>`}
          </div>

          <div class="mt-3" id="attempts_${c.challenge_id}" style="display:none"></div>
        </div>
      </div>
    `;
  }).join('');

  qsa('[data-action]').forEach(btn => btn.addEventListener('click', onAction));
}

function onAction(e){
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  const c = challenges.find(x => String(x.challenge_id) === String(id));
  if (!c) return;

  if (action === 'complete') {
    openCompleteModal(c);
    return;
  }
  if (action === 'edit') {
    openEditModal(c);
    return;
  }
  if (action === 'delete') {
    deleteChallenge(c, btn);
    return;
  }
  if (action === 'viewAttempts') {
    toggleAttempts(c);
    return;
  }
}

function openEditModal(challenge){
  editChallengeId = challenge ? challenge.challenge_id : null;
  qs('#modalTitle').textContent = editChallengeId ? `Edit Challenge #${editChallengeId}` : 'Create a Challenge';
  qs('#desc').value = challenge?.description ?? '';
  qs('#pts').value = challenge?.points ?? 10;
  const modalEl = qs('#challengeModal');
  new bootstrap.Modal(modalEl).show();
}

function submitChallenge(e){
  e.preventDefault();
  const btn = qs('#btnSaveChallenge');
  const description = qs('#desc').value.trim();
  const points = parseInt(qs('#pts').value, 10);

  if (!description || !Number.isInteger(points) || points <= 0) {
    toast('Please enter a description and a positive points value.', { kind: 'warning', title: 'Check your input' });
    return;
  }

  setLoading(btn, true, 'Saving...');
  const request = editChallengeId
    ? api.put(`/challenges/${editChallengeId}`, { description, points }, { auth: true })
    : api.post('/challenges', { description, points }, { auth: true });

  request
    .then(() => {
      if (editChallengeId) {
        toast('Challenge updated.', { kind: 'success', title: 'Saved' });
        addActivity({ title: 'Challenge updated', detail: `Challenge #${editChallengeId} edited`, icon: 'pencil' });
      } else {
        toast('Challenge created.', { kind: 'success', title: 'Created' });
        addActivity({ title: 'Challenge created', detail: description.slice(0, 60), icon: 'plus-circle' });
      }
      bootstrap.Modal.getInstance(qs('#challengeModal'))?.hide();
      return refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Could not save challenge.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function openCompleteModal(challenge){
  qs('#completeChallengeId').value = challenge.challenge_id;
  qs('#completeTitle').textContent = `Complete Challenge #${challenge.challenge_id}`;
  qs('#completeDesc').textContent = challenge.description;
  qs('#completePts').textContent = `Earn +${formatNumber(challenge.points)} points`;
  qs('#details').value = '';
  new bootstrap.Modal(qs('#completeModal')).show();
}

function submitCompletion(e){
  e.preventDefault();
  const btn = qs('#btnComplete');
  const challengeId = qs('#completeChallengeId').value;
  const details = qs('#details').value.trim();

  setLoading(btn, true, 'Submitting...');
  api.post(`/challenges/${challengeId}`, { details }, { auth: true })
    .then(() => {
      toast('Nice! Points added and boss damage applied (if a boss is active).', { kind: 'success', title: 'Completed' });
      if (getActiveEffect()) clearActiveEffect();
      addActivity({ title: 'Challenge completed', detail: `Challenge #${challengeId} completed`, icon: 'check2-circle' });
      bootstrap.Modal.getInstance(qs('#completeModal'))?.hide();
      return updatePointsChip();
    })
    .catch((err) => {
      toast(err?.message || 'Could not submit completion.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function deleteChallenge(challenge, btn){
  if (!confirm(`Delete Challenge #${challenge.challenge_id}? This cannot be undone.`)) return;
  setLoading(btn, true, 'Deleting...');
  api.del(`/challenges/${challenge.challenge_id}`, { auth: true })
    .then(() => {
      toast('Challenge deleted.', { kind: 'success', title: 'Deleted' });
      addActivity({ title: 'Challenge deleted', detail: `Challenge #${challenge.challenge_id} removed`, icon: 'trash' });
      return refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Could not delete challenge.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function toggleAttempts(challenge){
  const box = qs(`#attempts_${challenge.challenge_id}`);
  if (!box) return;

  const isHidden = box.style.display === 'none' || !box.style.display;
  if (!isHidden) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `<div class="text-muted small">Loading attempts...</div>`;

  api.get(`/challenges/${challenge.challenge_id}`)
    .then((attempts) => {
      box.innerHTML = `
        <div class="mt-2">
          <div class="fw-semibold">Attempts</div>
          <div class="small text-muted">(Shows user_id + details returned by backend)</div>
          <div class="mt-2">
            ${attempts.map(a => `
              <div class="wq-row">
                <div class="small">User #${escapeHtml(a.user_id)}</div>
                <div class="text-muted small">${escapeHtml(a.details || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    })
    .catch((err) => {
      box.innerHTML = `<div class="text-muted small">${escapeHtml(err?.message || 'No attempts found.')}</div>`;
    });
}

function updatePointsChip(){
  const el = qs('#pointsChip');
  if (!el) return Promise.resolve();
  return api.get('/users/me/points', { auth: true })
    .then((data) => {
      el.innerHTML = `<i class="bi bi-stars"></i>${formatNumber(data.points ?? 0)} pts`;
    })
    .catch(() => {
      // no-op
    });
}

function onFilterChange(){
  filters.query = qs('#challengeSearch')?.value.trim().toLowerCase() || '';
  filters.ownership = qs('#challengeFilter')?.value || 'all';
  filters.sort = qs('#challengeSort')?.value || 'newest';
  renderList();
}

function applyFilters(){
  let rows = [...challenges];
  if (filters.query) {
    rows = rows.filter(c => {
      const desc = String(c.description || '').toLowerCase();
      const id = String(c.challenge_id || '');
      return desc.includes(filters.query) || id.includes(filters.query);
    });
  }
  if (filters.ownership === 'mine') {
    rows = rows.filter(c => String(c.creator_id) === String(myUserId));
  } else if (filters.ownership === 'others') {
    rows = rows.filter(c => String(c.creator_id) !== String(myUserId));
  }

  if (filters.sort === 'newest') {
    rows.sort((a, b) => Number(b.challenge_id) - Number(a.challenge_id));
  } else if (filters.sort === 'oldest') {
    rows.sort((a, b) => Number(a.challenge_id) - Number(b.challenge_id));
  } else if (filters.sort === 'points_desc') {
    rows.sort((a, b) => Number(b.points) - Number(a.points));
  } else if (filters.sort === 'points_asc') {
    rows.sort((a, b) => Number(a.points) - Number(b.points));
  }
  return rows;
}
