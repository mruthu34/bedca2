import { mountNavbar } from '../components/navbar.js';
import { requireAuth, getUserIdFromToken } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';

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

async function init(){
  bindUi();
  await refresh();
}

function bindUi(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  qs('#btnOpenCreate')?.addEventListener('click', () => openEditModal(null));
  qs('#formChallenge')?.addEventListener('submit', submitChallenge);
  qs('#formComplete')?.addEventListener('submit', submitCompletion);
}

async function refresh(){
  const list = qs('#challengeList');
  if (!list) return;
  list.innerHTML = `<div class="text-muted">Loading challenges...</div>`;
  try {
    challenges = await api.get('/challenges');
    renderList();
    await updatePointsChip();
  } catch (err) {
    toast(err?.message || 'Could not load challenges.', { kind: 'danger', title: 'Error' });
    list.innerHTML = `<div class="text-muted">Failed to load.</div>`;
  }
}

function renderList(){
  const list = qs('#challengeList');
  if (!list) return;

  if (!Array.isArray(challenges) || challenges.length === 0) {
    list.innerHTML = `<div class="text-muted">No challenges yet. Create your first one!</div>`;
    return;
  }

  list.innerHTML = challenges.map(c => {
    const isOwner = (myUserId != null) && String(c.creator_id) === String(myUserId);
    return `
      <div class="col-12 col-lg-6">
        <div class="wq-glass p-3 h-100">
          <div class="d-flex justify-content-between gap-3">
            <div>
              <div class="fw-semibold">Challenge #${escapeHtml(c.challenge_id)}</div>
              <div class="text-muted small">Creator ID: ${escapeHtml(c.creator_id)}</div>
            </div>
            <div class="wq-badge">+${escapeHtml(c.points)} pts</div>
          </div>

          <div class="mt-3">${escapeHtml(c.description)}</div>

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-sm btn-primary" data-action="complete" data-id="${c.challenge_id}">Complete</button>
            <button class="btn btn-sm btn-outline-light" data-action="viewAttempts" data-id="${c.challenge_id}">Attempts</button>
            ${isOwner ? `
              <button class="btn btn-sm btn-outline-light" data-action="edit" data-id="${c.challenge_id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${c.challenge_id}">Delete</button>
            ` : `<span class="text-muted small align-self-center">You can only edit/delete your own challenges.</span>`}
          </div>

          <div class="mt-3" id="attempts_${c.challenge_id}" style="display:none"></div>
        </div>
      </div>
    `;
  }).join('');

  // attach listeners
  qsa('[data-action]').forEach(btn => btn.addEventListener('click', onAction));
}

async function onAction(e){
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
    await deleteChallenge(c, btn);
    return;
  }
  if (action === 'viewAttempts') {
    await toggleAttempts(c);
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

async function submitChallenge(e){
  e.preventDefault();
  const btn = qs('#btnSaveChallenge');
  const description = qs('#desc').value.trim();
  const points = parseInt(qs('#pts').value, 10);

  if (!description || !Number.isInteger(points) || points <= 0) {
    toast('Please enter a description and a positive points value.', { kind: 'warning', title: 'Check your input' });
    return;
  }

  try {
    setLoading(btn, true, 'Saving...');
    if (editChallengeId) {
      await api.put(`/challenges/${editChallengeId}`, { description, points }, { auth: true });
      toast('Challenge updated.', { kind: 'success', title: 'Saved' });
    } else {
      await api.post('/challenges', { description, points }, { auth: true });
      toast('Challenge created.', { kind: 'success', title: 'Created' });
    }
    bootstrap.Modal.getInstance(qs('#challengeModal'))?.hide();
    await refresh();
  } catch (err) {
    toast(err?.message || 'Could not save challenge.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
}

function openCompleteModal(challenge){
  qs('#completeChallengeId').value = challenge.challenge_id;
  qs('#completeTitle').textContent = `Complete Challenge #${challenge.challenge_id}`;
  qs('#completeDesc').textContent = challenge.description;
  qs('#completePts').textContent = `Earn +${formatNumber(challenge.points)} points`;
  qs('#details').value = '';
  new bootstrap.Modal(qs('#completeModal')).show();
}

async function submitCompletion(e){
  e.preventDefault();
  const btn = qs('#btnComplete');
  const challengeId = qs('#completeChallengeId').value;
  const details = qs('#details').value.trim();

  try {
    setLoading(btn, true, 'Submitting...');
    await api.post(`/challenges/${challengeId}`, { details }, { auth: true });
    toast('Nice! Points added and boss damage applied (if a boss is active).', { kind: 'success', title: 'Completed' });
    bootstrap.Modal.getInstance(qs('#completeModal'))?.hide();
    await updatePointsChip();
  } catch (err) {
    toast(err?.message || 'Could not submit completion.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
}

async function deleteChallenge(challenge, btn){
  if (!confirm(`Delete Challenge #${challenge.challenge_id}? This cannot be undone.`)) return;
  try {
    setLoading(btn, true, 'Deleting...');
    await api.del(`/challenges/${challenge.challenge_id}`, { auth: true });
    toast('Challenge deleted.', { kind: 'success', title: 'Deleted' });
    await refresh();
  } catch (err) {
    toast(err?.message || 'Could not delete challenge.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
}

async function toggleAttempts(challenge){
  const box = qs(`#attempts_${challenge.challenge_id}`);
  if (!box) return;

  const isHidden = box.style.display === 'none' || !box.style.display;
  if (!isHidden) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `<div class="text-muted small">Loading attempts...</div>`;

  try {
    const attempts = await api.get(`/challenges/${challenge.challenge_id}`);
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
  } catch (err) {
    box.innerHTML = `<div class="text-muted small">${escapeHtml(err?.message || 'No attempts found.')}</div>`;
  }
}

async function updatePointsChip(){
  const el = qs('#pointsChip');
  if (!el) return;
  try {
    const data = await api.get('/users/me/points', { auth: true });
    el.textContent = `${formatNumber(data.points ?? 0)} pts`;
  } catch {
    // no-op
  }
}
