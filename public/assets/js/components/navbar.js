import { ROUTES } from '../config.js';
import { isAuthed } from '../storage.js';
import { logout } from '../auth.js';

export function mountNavbar(active){
  const el = document.getElementById('appNavbar');
  if (!el) return;

  const authed = isAuthed();

  const link = (href, label, key) => {
    const cls = (active === key) ? 'nav-link active' : 'nav-link';
    return `<li class="nav-item"><a class="${cls}" href="${href}">${label}</a></li>`;
  };

  el.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-dark py-3">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2" href="${ROUTES.home}">
        <span class="wq-logo">WQ</span>
        <span class="fw-semibold">WellQuest</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMain" aria-controls="navMain" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navMain">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          ${authed ? `
            ${link(ROUTES.dashboard, 'Dashboard', 'dashboard')}
            ${link(ROUTES.challenges, 'Challenges', 'challenges')}
            ${link(ROUTES.boss, 'Boss Raid', 'boss')}
            ${link(ROUTES.shop, 'Shop', 'shop')}
            ${link(ROUTES.inventory, 'Inventory', 'inventory')}
          ` : `
            ${link(ROUTES.home, 'Home', 'home')}
          `}
        </ul>

        <div class="d-flex gap-2">
          ${authed ? `
            <button id="btnLogout" class="btn btn-outline-light btn-sm">Logout</button>
          ` : `
            <a class="btn btn-outline-light btn-sm" href="${ROUTES.login}">Login</a>
            <a class="btn btn-primary btn-sm" href="${ROUTES.register}">Sign up</a>
          `}
        </div>
      </div>
    </div>
  </nav>
  `;

  const btn = document.getElementById('btnLogout');
  if (btn) btn.addEventListener('click', logout);
}
