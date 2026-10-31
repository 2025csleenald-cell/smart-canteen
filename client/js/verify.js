requireLogin();
const form = document.getElementById('verifyForm');
const msg = document.getElementById('error');
 
const pre = new URLSearchParams(location.search).get('order');
if (pre) orderId.value = pre;
 
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.style.color = '';
  msg.textContent = '';
  try {
    const data = await api(`/admin/orders/${encodeURIComponent(orderId.value.trim().toUpperCase())}/verify-otp`, {
      method: 'POST',
      body: { otp: otp.value.trim() }
    });
    msg.style.color = 'var(--ok)';
    msg.textContent = '✔ ' + data.message;
    form.reset();
  } catch (err) { msg.textContent = err.message; }
});
 
// Generate the code and send it to the student (also done automatically by the dashboard's Verify button)
const sendBtn = document.getElementById('sendCode');
const note = (text, ok) => { msg.style.color = ok ? 'var(--ok)' : ''; msg.textContent = text; };
if (new URLSearchParams(location.search).get('sent')) note('✔ Code sent to the student. Ask them to read it out, then enter it below.', true);
sendBtn.addEventListener('click', async () => {
  const id = orderId.value.trim().toUpperCase();
  if (!id) return note('Enter the Order ID first.');
  try {
    const data = await api(`/admin/orders/${encodeURIComponent(id)}/send-otp`, { method: 'POST' });
    note('✔ ' + data.message, true);
    otp.focus();
  } catch (err) { note(err.message); }
});
 