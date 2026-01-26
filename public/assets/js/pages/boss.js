import { mountNavbar } from '../components/navbar.js';
import { requireAuth } from '../auth.js';
import { api } from '../api.js';
import { qs, toast, setLoading, escapeHtml, formatNumber } from '../ui.js';
import { addActivity, clearActiveEffect, getActiveEffect } from '../storage.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });

const bossImages = {
  "Stress Dragon": "https://static.wikia.nocookie.net/dragoncity/images/0/0a/Stressed_Dragon_1.png/revision/latest?cb=20250528062816",
  "Burnout Titan": "https://static.wikia.nocookie.net/shingekinokyojin/images/e/ed/Colossal_Titan_%28Anime%29_character_image_%28Armin_Arlelt%29.png/revision/latest?cb=20220222211301",
  "Anxiety Kraken": "https://static.vecteezy.com/system/resources/previews/060/152/448/non_2x/wonderful-remarkable-kraken-sea-monster-giant-squid-like-no-background-with-transparent-background-free-png.png",
  "Procrastination Phantom": "https://m.media-amazon.com/images/I/61RfFHvIc1L._AC_UF350,350_QL80_.jpg",
  "Deadline Demon": "https://clipart-library.com/images_k/demon-transparent-background/demon-transparent-background-16.jpg",
  "Caffeine Golem": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKpTgSF7Wc6Bq0_7ZZpqA2myuxGuFjM9A4sQ&s",
  "Mind Fog Colossus": "https://upload.wikimedia.org/wikipedia/en/thumb/2/26/Colossus-AvX_Consequences.jpg/250px-Colossus-AvX_Consequences.jpg",
  "Overcommitment Hydra": "https://static.wikia.nocookie.net/monster/images/6/69/Hydra_2_by_el_grimlock.jpg/revision/latest?cb=20100906180948",
  "Meeting Minotaur": "https://static.wikia.nocookie.net/forgottenrealms/images/3/3d/Minotaur-5e.png/revision/latest/scale-to-width/360?cb=20161209024527",
  "Inbox Wraith": "https://p1.hiclipart.com/preview/374/233/89/dementor-black-ghost-graphic-png-clipart.jpg",
  "Focus Lord": "https://p7.hiclipart.com/preview/389/202/346/the-hobbit-the-lord-of-the-rings-gandalf-bilbo-baggins-wall-decal-the-hobbit.jpg",
  "Focus Leech": "https://p7.hiclipart.com/preview/389/202/346/the-hobbit-the-lord-of-the-rings-gandalf-bilbo-baggins-wall-decal-the-hobbit.jpg",
  "Perfectionism Cyclops": "https://p7.hiclipart.com/preview/797/687/703/cyclops-jean-grey-professor-x-nightcrawler-x-men-supernatural-powers.jpg"
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
  mountNavbar('boss');
  init();
}

function init(){
  bindUi();
  refresh();
  updateDamagePreview();
}

function bindUi(){
  qs('#btnRefresh')?.addEventListener('click', refresh);
  qs('#formHit')?.addEventListener('submit', hitBoss);
  qs('#pointsSpent')?.addEventListener('input', updateDamagePreview);
}

function refresh(){
  Promise.allSettled([loadBoss(), loadLeaderboard(), loadPoints()]).then(() => {
    updateDamagePreview();
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

function loadBoss(){
  const el = qs('#bossCard');
  if (!el) return Promise.resolve();

  return api.get('/boss')
    .then((boss) => {
      const pct = boss.max_hp ? Math.max(0, Math.min(100, (boss.current_hp / boss.max_hp) * 100)) : 0;
      const displayName = getBossDisplayName(boss.name);
      const imgSrc = getBossImage(displayName);

      el.innerHTML = `
        <div class="boss-media">
          <div class="boss-img-wrap">
            <img class="boss-img" src="${imgSrc}" alt="${escapeHtml(displayName)}" loading="lazy" />
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start gap-3">
              <div>
                <div class="h3 mb-1">${escapeHtml(displayName)}</div>
                <div class="text-muted">HP ${formatNumber(boss.current_hp)} / ${formatNumber(boss.max_hp)}</div>
              </div>
              <span class="wq-status"><i class="bi bi-activity"></i>Active</span>
            </div>
            <div class="mt-3 progress wq-progress" role="progressbar" aria-label="Boss HP">
              <div class="progress-bar" style="width:${pct}%"></div>
            </div>
            <div class="mt-3 text-muted small">
              Tip: Completing challenges also deals damage (based on points), and items can boost your next hit.
            </div>
          </div>
        </div>
      `;
    })
    .catch(() => {
      el.innerHTML = `<div class="text-muted">No active boss found. Complete a challenge to kick off the raid.</div>`;
    });
}

function loadLeaderboard(){
  const el = qs('#leaderboardBody');
  if (!el) return Promise.resolve();
  el.innerHTML = `<tr><td colspan="3" class="text-muted">Loading...</td></tr>`;

  return api.get('/boss/leaderboard')
    .then((rows) => {
      if (!rows.length) {
        el.innerHTML = `<tr><td colspan="3" class="text-muted">No damage logs yet.</td></tr>`;
        return;
      }
      el.innerHTML = rows.map((r, i) => `
        <tr>
          <td class="text-muted">${i+1}</td>
          <td>${escapeHtml(r.username)} <span class="text-muted small">(#${escapeHtml(r.user_id)})</span></td>
          <td class="fw-semibold">${formatNumber(r.total_damage || 0)}</td>
        </tr>
      `).join('');
    })
    .catch((err) => {
      el.innerHTML = `<tr><td colspan="3" class="text-muted">${escapeHtml(err?.message || 'Failed to load.')}</td></tr>`;
    });
}

function hitBoss(e){
  e.preventDefault();
  const btn = qs('#btnHit');
  const points_spent = parseInt(qs('#pointsSpent').value, 10);

  if (!Number.isInteger(points_spent) || points_spent <= 0) {
    toast('Please enter a positive integer.', { kind: 'warning', title: 'Invalid points' });
    return;
  }

  setLoading(btn, true, 'Attacking...');
  api.post('/boss/hit', { points_spent }, { auth: true })
    .then((res) => {
      toast(`You dealt ${formatNumber(res.damage)} damage!`, { kind: 'success', title: 'Hit landed' });
      if (getActiveEffect()) clearActiveEffect();
      addActivity({ title: 'Boss hit', detail: `${formatNumber(res.damage)} damage dealt`, icon: 'crosshair' });
      refresh();
    })
    .catch((err) => {
      toast(err?.message || 'Could not hit boss.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
}

function updateDamagePreview(){
  const el = qs('#damagePreview');
  if (!el) return;
  const points = parseInt(qs('#pointsSpent')?.value, 10);
  if (!Number.isInteger(points) || points <= 0) {
    el.textContent = 'Estimated damage appears here.';
    return;
  }
  const effect = getActiveEffect();
  if (effect) {
    const total = (points * (Number(effect.multiplier) || 1)) + (Number(effect.bonus_damage) || 0);
    el.innerHTML = `Estimated damage: <span class="fw-semibold">${formatNumber(total)}</span> (includes +${formatNumber(effect.bonus_damage || 0)} and x${formatNumber(effect.multiplier || 1)})`;
  } else {
    el.innerHTML = `Estimated damage: <span class="fw-semibold">${formatNumber(points)}</span> (no active item effect)`;
  }
}
