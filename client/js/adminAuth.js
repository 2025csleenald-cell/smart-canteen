const form = document.getElementById('adminLoginForm');
const errBox = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
  try {
    const data = await api('/auth/admin/login', {
      method: 'POST',
      body: { identifier: identifier.value, password: password.value }
    });
    localStorage.setItem('adminToken', data.token);
    location.href = 'dashboard.html';
  } catch (err) { errBox.textContent = err.message; }
});
