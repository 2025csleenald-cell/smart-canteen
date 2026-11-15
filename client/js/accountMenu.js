// Account icon in the top bar: opens a menu with My orders, Profile and Log out
(function () {
  const btn = document.getElementById('acctBtn');
  const menu = document.getElementById('acctMenu');
  if (!btn || !menu) return;

  const setOpen = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });

  const nameEl = document.getElementById('acctName');
  const saved = localStorage.getItem('studentName');
  if (saved) nameEl.textContent = saved;
  api('/auth/me').then((u) => {
    nameEl.textContent = u.name;
    document.getElementById('acctEmail').textContent = u.email;
    localStorage.setItem('studentName', u.name);
  }).catch(() => {});
})();