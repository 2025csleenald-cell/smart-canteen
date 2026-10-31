// Shared helpers used by every page
const isAdminPage = location.pathname.includes('/admin/');
const TOKEN_KEY = isAdminPage ? 'adminToken' : 'studentToken';
 
async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { localStorage.removeItem(TOKEN_KEY); location.replace('login.html'); }
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
 
// Send visitors to the login page if they are not logged in (the API still enforces this on the server)
function requireLogin() { if (!localStorage.getItem(TOKEN_KEY)) location.replace('login.html'); }
 
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
const statusLabel = (s) => ({ placed: 'Placed', queued: 'In queue', preparing: 'Preparing', ready: 'Ready', collected: 'Collected', delayed: 'Delayed', cancelled: 'Cancelled', pickup_expired: 'Pickup expired' }[s] || s);
 
document.addEventListener('click', (e) => {
  if (e.target.closest('#logout')) {
    e.preventDefault();
    localStorage.removeItem(TOKEN_KEY);
    location.href = 'login.html';
  }
});
 
// Upload a file (multipart form) with the login token
async function apiUpload(path, formData) {
  const res = await fetch('/api' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) }, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}
 
