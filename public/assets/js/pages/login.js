import { mountNavbar } from '../components/navbar.js';
import { login } from '../auth.js';
import { ROUTES } from '../config.js';
import { qs, toast, setLoading } from '../ui.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });


mountNavbar('');

const form = qs('#loginForm');
const btn = qs('#btnLogin');

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = qs('#username')?.value?.trim();
  const password = qs('#password')?.value;

  if (!username || !password) {
    toast('Please enter username and password.', { kind: 'warning', title: 'Missing info' });
    return;
  }

  setLoading(btn, true, 'Signing in...');
  login(username, password)
    .then(() => {
      toast('Welcome back!', { kind: 'success', title: 'Logged in' });
      window.location.href = ROUTES.dashboard;
    })
    .catch((err) => {
      toast(err?.message || 'Login failed.', { kind: 'danger', title: 'Error' });
    })
    .finally(() => {
      setLoading(btn, false);
    });
});
