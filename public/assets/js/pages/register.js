import { mountNavbar } from '../components/navbar.js';
import { register } from '../auth.js';
import { ROUTES } from '../config.js';
import { qs, toast, setLoading } from '../ui.js';

import { consumeFlash } from '../auth.js';

const flash = consumeFlash();
if (flash?.message) toast(flash.message, { kind: flash.kind || 'info' });

const allowedEmailDomains = ['gmail.com', 'hotmail.com', 'outlook.com'];

mountNavbar('');

const form = qs('#registerForm');
const btn = qs('#btnRegister');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = qs('#username')?.value?.trim();
  const email = qs('#email')?.value?.trim();
  const password = qs('#password')?.value;
  const confirm = qs('#confirm')?.value;

  if (!username || !email || !password) {
    toast('Please fill in all fields.', { kind: 'warning', title: 'Missing info' });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    toast('Please enter a valid email address.', { kind: 'warning', title: 'Invalid email' });
    return;
  }
  const domain = email.toLowerCase().split('@')[1];
  if (!allowedEmailDomains.includes(domain)) {
    toast(`Email must be from: ${allowedEmailDomains.join(', ')}`, { kind: 'warning', title: 'Invalid domain' });
    return;
  }
  if (password !== confirm) {
    toast('Passwords do not match.', { kind: 'warning', title: 'Check again' });
    return;
  }

  try {
    setLoading(btn, true, 'Creating account...');
    await register({ username, email, password });
    toast('Account created!', { kind: 'success', title: 'Welcome' });
    window.location.href = ROUTES.dashboard;
  } catch (err) {
    toast(err?.message || 'Registration failed.', { kind: 'danger', title: 'Error' });
  } finally {
    setLoading(btn, false);
  }
});
