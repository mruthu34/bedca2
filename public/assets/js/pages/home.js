import { mountNavbar } from '../components/navbar.js';
import { ROUTES } from '../config.js';
import { isAuthed } from '../storage.js';

import { consumeFlash } from '../auth.js';
import { toast } from '../ui.js';

// Show any one-time message from a redirect (e.g., logout/session expiry).
const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });


mountNavbar('home');

// CTA differs for guests vs authenticated users.
const cta = document.getElementById('homeCta');
if (cta) {
  if (isAuthed()) {
    cta.innerHTML = `<a class="btn btn-primary btn-lg" href="${ROUTES.dashboard}">Go to Dashboard</a>`;
  } else {
    cta.innerHTML = `<div class="d-flex flex-wrap gap-2">
      <a class="btn btn-primary btn-lg" href="${ROUTES.register}">Create an account</a>
      <a class="btn btn-outline-light btn-lg" href="${ROUTES.login}">Log in</a>
    </div>`;
  }
}
