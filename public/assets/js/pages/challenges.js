import { mountNavbar } from '../components/navbar.js';
import { requireAuth, getUserIdFromToken } from '../auth.js';
import { api } from '../api.js';
import { qs, qsa, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity, clearActiveEffect, getActiveEffect } from '../storage.js';

import { consumeFlash } from '../auth.js';

// Show any one-time message from a redirect (e.g., logout/session expiry).
const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });

let myUserId = getUserIdFromToken();
let challenges = [];
let editChallengeId = null;
let reviewChallengeId = null;
const filters = { query: '', ownership: 'all', sort: 'newest' };
const completionCooldownMs = 60 * 1000;
let cooldownTimer = null;

// Signal other tabs/pages that boss HP might have changed.
function notifyBossUpdated(){
  try {
    localStorage.setItem('bossUpdateAt', String(Date.now()));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('boss_updates');
      bc.postMessage({ type: 'bossUpdate', at: Date.now() });
      bc.close();
    }
  } catch {
    // ignore cross-tab signaling failures
  }
}

if (!requireAuth()) {
  // redirected
} else {
  mountNavbar('challenges');
  init();
}

function init(){
  bindUi();
  refresh();
}

function bindUi(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  qs('#btnOpenCreate')?.addEventListener('click', () => openEditModal(null));
  qs('#formChallenge')?.addEventListener('submit', submitChallenge);
  qs('#formComplete')?.addEventListener('submit', submitCompletion);
  qs('#formReview')?.addEventListener('submit', submitReview);
  qs('#challengeSearch')?.addEventListener('input', onFilterChange);
  qs('#challengeFilter')?.addEventListener('change', onFilterChange);
  qs('#challengeSort')?.addEventListener('change', onFilterChange);
}

// Load challenge list, then decorate it with per-user review info.
function refresh(){
  const list = qs('#challengeList');
  if (!list) return Promise.resolve();
  list.innerHTML = `<div class="text-muted">Loading challenges...</div>`;
  return api.get('/challenges')
    .then((rows) => {
      challenges = rows;
      return enrichChallengesWithMyReviews(challenges)
        .then(() => {
          renderList();
          return updatePointsChip();
        });
    })
    .catch((err) => {
      toast(err?.message || 'Could not load challenges.', { kind: 'danger', title: 'Error' });
      list.innerHTML = `<div class="text-muted">Failed to load.</div>`;
    });
}

// Render cards based on filters + ownership state.
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
    const creatorLabel = c.creator_username ? escapeHtml(c.creator_username) : 'Unknown';
    const reviewCount = Number(c.review_count) || 0;
    let avgRating = Number(c.avg_rating);
    if (!Number.isFinite(avgRating)) avgRating = 0;
    const ratingLabel = reviewCount
      ? `${avgRating.toFixed(1)} / 5 (${reviewCount} review${reviewCount === 1 ? '' : 's'})`
      : 'No reviews yet';
    const reviewButtonLabel = c.hasMyReview ? 'Edit Review' : 'Reviews';
    return `
      <div class="col-12 col-lg-6">
        <div class="card-glass p-3 h-100">
          <div class="d-flex justify-content-between gap-3">
            <div>
              <div class="fw-semibold">Challenge #${escapeHtml(c.challenge_id)}</div>
              <div class="text-muted small">Creator: ${creatorLabel}</div>
            </div>
            <div class="d-flex flex-wrap gap-2 justify-content-end">
              ${isOwner ? `<span class="wq-badge"><i class="bi bi-person-check"></i>Mine</span>` : ''}
              <span class="wq-badge"><i class="bi bi-gift"></i>+${escapeHtml(c.points)} pts</span>
              <span class="wq-badge"><i class="bi bi-star-fill"></i>${escapeHtml(ratingLabel)}</span>
            </div>
          </div>

          <div class="mt-3">${escapeHtml(c.description)}</div>

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-sm btn-primary" data-action="complete" data-id="${c.challenge_id}"><i class="bi bi-check2-circle"></i>Complete</button>
            <button class="btn btn-sm btn-outline-light" data-action="viewAttempts" data-id="${c.challenge_id}"><i class="bi bi-journal-text"></i>Attempts</button>
            <button class="btn btn-sm btn-outline-light" data-action="reviews" data-id="${c.challenge_id}"><i class="bi bi-chat-right-text"></i>${reviewButtonLabel}</button>
            ${isOwner ? `
              <button class="btn btn-sm btn-outline-light" data-action="edit" data-id="${c.challenge_id}"><i class="bi bi-pencil"></i>Edit Challenge</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${c.challenge_id}"><i class="bi bi-trash"></i>Delete</button>
            ` : `<span class="text-muted small align-self-center">You can only edit/delete your own challenges.</span>`}
          </div>

          <div class="mt-3" id="attempts_${c.challenge_id}" style="display:none"></div>
        </div>
      </div>
    `;
  }).join('');

  qsa('[data-action]').forEach(btn => btn.addEventListener('click', onAction));
  applyCompletionCooldowns();
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
  if (action === 'reviews') {
    openReviewsModal(c);
    return;
  }
}

// Open modal for create/edit with prefilled values when editing.
function openEditModal(challenge){
  editChallengeId = challenge ? challenge.challenge_id : null;
  qs('#modalTitle').textContent = editChallengeId ? `Edit Challenge #${editChallengeId}` : 'Create a Challenge';
  qs('#desc').value = challenge?.description ?? '';
  qs('#pts').value = challenge?.points ?? 10;
  const modalEl = qs('#challengeModal');
  new bootstrap.Modal(modalEl).show();
}

// Create or update a challenge, then refresh the list.
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
        addActivity({ title: 'Challenge updated', detail: `Challenge #${editChallengeId} edited`, icon: 'pencil' }, myUserId);
      } else {
        toast('Challenge created.', { kind: 'success', title: 'Created' });
        addActivity({ title: 'Challenge created', detail: description.slice(0, 60), icon: 'plus-circle' }, myUserId);
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

// Open review modal and check whether user is eligible to review.
function openReviewsModal(challenge){
  reviewChallengeId = challenge.challenge_id;
  qs('#reviewsTitle').textContent = `Reviews for Challenge #${challenge.challenge_id}`;
  qs('#reviewComment').value = '';
  qs('#reviewRating').value = '5';
  setReviewFormEnabled(false, 'Checking completion status...');
  loadReviews();
  checkCanReview(challenge);
  new bootstrap.Modal(qs('#reviewsModal')).show();
}

function loadReviews(){
  const box = qs('#reviewsList');
  if (!box || !reviewChallengeId) return;
  box.innerHTML = `<div class="text-muted small">Loading reviews...</div>`;
  api.get(`/challenges/${reviewChallengeId}/reviews`)
    .then((rows) => {
      if (!rows.length) {
        box.innerHTML = `<div class="text-muted small">No reviews yet. Be the first to leave one.</div>`;
        return;
      }
      box.innerHTML = rows.map(r => `
        <div class="wq-row">
          <div class="d-flex justify-content-between">
            <div class="fw-semibold">${escapeHtml(r.username)}</div>
            <div class="text-muted small">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          </div>
          <div class="text-muted small">${escapeHtml(r.comment || '')}</div>
        </div>
      `).join('');
    })
    .catch((err) => {
      box.innerHTML = `<div class="text-muted small">${escapeHtml(err?.message || 'Failed to load reviews.')}</div>`;
    });
}

function submitReview(e){
  e.preventDefault();
  const btn = qs('#btnSubmitReview');
  if (!reviewChallengeId) return;
  const rating = parseInt(qs('#reviewRating').value, 10);
  const comment = qs('#reviewComment').value.trim();

  setLoading(btn, true, 'Submitting...');
  api.post(`/challenges/${reviewChallengeId}/reviews`, { rating, comment }, { auth: true })
    .then(() => {
      toast('Review submitted.', { kind: 'success', title: 'Thanks!' });
      markChallengeReviewed(reviewChallengeId);
      loadReviews();
    })
    .catch((err) => {
      toast(err?.message || 'Could not submit review.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

// Reviews only allowed after completion.
function checkCanReview(challenge){
  const challengeId = challenge.challenge_id;
  const userId = myUserId;
  if (!userId) {
    setReviewFormEnabled(false, 'Sign in to leave a review.');
    return;
  }

  api.get(`/challenges/${challengeId}`)
    .then((attempts) => {
      const completed = Array.isArray(attempts)
        && attempts.some(a => String(a.user_id) === String(userId));
      if (!completed) {
        setReviewFormEnabled(false, 'You can only review challenges you completed.');
        toast('You can only review challenges you completed.', { kind: 'warning', title: 'Not completed' });
        return;
      }
      setReviewFormEnabled(true, 'You can only review challenges you completed, and only once.');
    })
    .catch(() => {
      setReviewFormEnabled(false, 'Unable to verify completion status.');
    });
}

function setReviewFormEnabled(enabled, helperText){
  const form = qs('#formReview');
  const btn = qs('#btnSubmitReview');
  const helper = form ? form.querySelector('.form-text') : null;
  if (helperText && helper) helper.textContent = helperText;
  if (form) {
    form.querySelectorAll('select, textarea, button[type="submit"]').forEach((el) => {
      el.disabled = !enabled;
    });
  }
  if (btn) btn.disabled = !enabled;
}

// Mark whether current user already reviewed each challenge.
function enrichChallengesWithMyReviews(rows){
  if (!myUserId || !Array.isArray(rows) || rows.length === 0) return Promise.resolve();
  const lookups = rows.map(c =>
    api.get(`/challenges/${c.challenge_id}/reviews`)
      .then((reviews) => {
        c.hasMyReview = Array.isArray(reviews)
          ? reviews.some(r => String(r.user_id) === String(myUserId))
          : false;
      })
      .catch(() => {
        c.hasMyReview = false;
      })
  );
  return Promise.all(lookups);
}

function markChallengeReviewed(challengeId){
  const id = String(challengeId);
  const c = challenges.find(x => String(x.challenge_id) === id);
  if (c) c.hasMyReview = true;
  const btn = qs(`[data-action="reviews"][data-id="${id}"]`);
  if (btn) {
    const icon = btn.querySelector('i')?.outerHTML || '<i class="bi bi-chat-right-text"></i>';
    btn.innerHTML = `${icon}Edit Review`;
  }
}
// Submit completion, apply boss damage, and start client cooldown timer.
function submitCompletion(e){
  e.preventDefault();
  const btn = qs('#btnComplete');
  const challengeId = qs('#completeChallengeId').value;
  const details = qs('#details').value.trim();

  setLoading(btn, true, 'Submitting...');
  api.post(`/challenges/${challengeId}`, { details }, { auth: true })
    .then(() => {
      toast('Nice! Points added and boss damage applied (if a boss is active).', { kind: 'success', title: 'Completed' });
      if (getActiveEffect(myUserId)) clearActiveEffect(myUserId);
      addActivity({ title: 'Challenge completed', detail: `Challenge #${challengeId} completed`, icon: 'check2-circle' }, myUserId);
      notifyBossUpdated();
      setCompletionCooldown(challengeId);
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

// Persist client-side cooldown timers per challenge.
function loadCompletionCooldowns(){
  try {
    const raw = localStorage.getItem('completionCooldowns');
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCompletionCooldowns(map){
  try {
    localStorage.setItem('completionCooldowns', JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function setCompletionCooldown(challengeId){
  const id = String(challengeId);
  const map = loadCompletionCooldowns();
  map[id] = Date.now() + completionCooldownMs;
  saveCompletionCooldowns(map);
  applyCompletionCooldowns();
}

// Disable "Complete" buttons while cooldown is active.
function applyCompletionCooldowns(){
  const map = loadCompletionCooldowns();
  const now = Date.now();
  let hasActive = false;

  qsa('[data-action="complete"]').forEach(btn => {
    const id = String(btn.dataset.id || '');
    const endAt = map[id];
    if (!endAt || endAt <= now) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle"></i>Complete';
      if (endAt) {
        delete map[id];
      }
      return;
    }

    hasActive = true;
    btn.disabled = true;
    btn.innerHTML = `<i class="bi bi-hourglass-split"></i>Wait ${formatRemaining(endAt - now)}`;
  });

  saveCompletionCooldowns(map);
  ensureCooldownTicker(hasActive);
}

function ensureCooldownTicker(hasActive){
  if (hasActive && !cooldownTimer) {
    cooldownTimer = setInterval(applyCompletionCooldowns, 1000);
  } else if (!hasActive && cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function formatRemaining(ms){
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function deleteChallenge(challenge, btn){
  if (!confirm(`Delete Challenge #${challenge.challenge_id}? This cannot be undone.`)) return;
  setLoading(btn, true, 'Deleting...');
  api.del(`/challenges/${challenge.challenge_id}`, { auth: true })
    .then(() => {
      toast('Challenge deleted.', { kind: 'success', title: 'Deleted' });
      addActivity({ title: 'Challenge deleted', detail: `Challenge #${challenge.challenge_id} removed`, icon: 'trash' }, myUserId);
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
                <div class="small">${escapeHtml(a.user_username || 'Unknown')}</div>
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
  const navEl = qs('#navPoints');
  if (!el && !navEl) return Promise.resolve();
  return api.get('/users/me/points', { auth: true })
    .then((data) => {
      const html = `<i class="bi bi-stars"></i>${formatNumber(data.points ?? 0)} pts`;
      if (el) el.innerHTML = html;
      if (navEl) navEl.innerHTML = html;
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
