export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function escapeHtml(str=''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

export function formatNumber(n){
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString();
}

export function toast(message, { title='Boss Breaker', kind='info', delay=3500 }={}){
  const container = document.getElementById('toastContainer');
  if (!container) return alert(`${title}: ${message}`);

  const id = `t_${Math.random().toString(16).slice(2)}`;
  const bgClass = kind === 'danger' ? 'text-bg-danger'
               : kind === 'success' ? 'text-bg-success'
               : kind === 'warning' ? 'text-bg-warning'
               : 'text-bg-dark';

  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <div class="fw-semibold mb-1">${title}</div>
          <div class="small">${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `);

  const el = document.getElementById(id);
  const t = new bootstrap.Toast(el, { delay });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

export function setLoading(btn, isLoading, labelWhenLoading='Loading...'){
  if (!btn) return;
  if (isLoading) {
    btn.dataset._label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${labelWhenLoading}`;
  } else {
    btn.disabled = false;
    if (btn.dataset._label) btn.innerHTML = btn.dataset._label;
  }
}
