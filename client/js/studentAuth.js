const loginForm = document.getElementById('studentLoginForm');
const registerForm = document.getElementById('registerForm');
const errBox = document.getElementById('error');

if (localStorage.getItem('studentToken') && loginForm) location.replace('menu.html');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
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
    await api('/auth/register', {
      method: 'POST',
      body: {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
      }
    });
    location.href = 'login.html';
  } catch (err) { errBox.textContent = err.message; }
});
