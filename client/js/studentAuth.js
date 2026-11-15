const loginForm = document.getElementById('studentLoginForm');
const registerForm = document.getElementById('registerForm');
const errBox = document.getElementById('error');

const q = new URLSearchParams(location.search);
if (loginForm && q.get('verified')) { errBox.style.color = 'var(--ok)'; errBox.textContent = '✔ Email verified. You can log in now.'; }
if (loginForm && q.get('verifyfailed')) errBox.textContent = 'That verification link is invalid or has expired. Log in and we will send a new one.';

if (localStorage.getItem('studentToken') && loginForm) location.replace('menu.html');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
  errBox.style.color = '';
  try {
    const data = await api('/auth/student/login', {
      method: 'POST',
      body: { identifier: identifier.value, password: password.value }
    });
    localStorage.setItem('studentToken', data.token);
    localStorage.setItem('studentName', data.user.name);
    location.href = 'menu.html';
  } catch (err) { errBox.textContent = err.message; }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        name: document.getElementById('name').value,
        usn: document.getElementById('usn').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      }
    });
    registerForm.innerHTML = `<h2>Check your email</h2><p>${esc(data.message)}</p><a class="btn block" href="login.html">Go to login</a>`;
  } catch (err) { errBox.textContent = err.message; }
});
