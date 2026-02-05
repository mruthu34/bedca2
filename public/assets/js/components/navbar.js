import { ROUTES } from '../config.js';
import { isAuthed } from '../storage.js';
import { logout } from '../auth.js';
import { api } from '../api.js';
import { formatNumber } from '../ui.js';

// Render navbar with auth-aware links and optional active state.
export function mountNavbar(active){
  const el = document.getElementById('appNavbar');
  if (!el) return;

  const authed = isAuthed();

  const link = (href, label, key, icon) => {
    const isActive = active === key;
    const cls = isActive ? 'nav-link active' : 'nav-link';
    const aria = isActive ? 'aria-current="page"' : '';
    return `<li class="nav-item"><a class="${cls}" ${aria} href="${href}"><i class="bi bi-${icon}"></i>${label}</a></li>`;
  };

  el.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-dark py-3">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2" href="${ROUTES.home}">
        <span class="wq-logo"><i class="bi bi-compass"></i></span>
        <span class="fw-semibold">Boss Breaker</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain" aria-controls="navMain" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navMain">
        <ul class="navbar-nav mx-lg-auto mb-2 mb-lg-0">
          ${authed ? `
            ${link(ROUTES.dashboard, 'Dashboard', 'dashboard', 'grid-1x2')}
            ${link(ROUTES.challenges, 'Challenges', 'challenges', 'flag')}
            ${link(ROUTES.boss, 'Boss Raid', 'boss', 'crosshair')}
            ${link(ROUTES.shop, 'Shop', 'shop', 'bag-heart')}
            ${link(ROUTES.inventory, 'Inventory', 'inventory', 'backpack')}
            ${link(ROUTES.profile, 'Profile', 'profile', 'person-circle')}
          ` : `
            ${link(ROUTES.home, 'Home', 'home', 'house')}
          `}
        </ul>

        <div class="d-flex gap-2 align-items-center">
          ${authed ? `
            <span id="navPoints" class="wq-pill"><i class="bi bi-stars"></i>-- pts</span>
            <button id="btnLogout" class="btn btn-outline-light btn-sm"><i class="bi bi-box-arrow-right"></i>Logout</button>
          ` : `
            <a class="btn btn-outline-light btn-sm" href="${ROUTES.login}"><i class="bi bi-box-arrow-in-right"></i>Login</a>
            <a class="btn btn-primary btn-sm" href="${ROUTES.register}"><i class="bi bi-rocket-takeoff"></i>Sign up</a>
          `}
        </div>
      </div>
    </div>
  </nav>
  `;

  const btn = document.getElementById('btnLogout');
  if (btn) btn.addEventListener('click', logout);

  // Lazy-load points to avoid blocking initial render.
  if (authed) loadPoints();
}

// Fetch points to show in the navbar pill.
function loadPoints(){
  const el = document.getElementById('navPoints');
  if (!el) return;
  api.get('/users/me/points', { auth: true })
    .then((data) => {
      el.innerHTML = `<i class="bi bi-stars"></i>${formatNumber(data.points ?? 0)} pts`;
    })
    .catch(() => {});
}
