requireLogin();
api('/auth/me').then((u) => {
  document.getElementById('pName').textContent = u.name;
  document.getElementById('pUsn').textContent = u.usn || 'Not set';
  document.getElementById('pEmail').textContent = u.email;
  document.getElementById('avatar').textContent = (u.name || '?').trim().charAt(0).toUpperCase();
}).catch((e) => { document.getElementById('pName').textContent = e.message; });