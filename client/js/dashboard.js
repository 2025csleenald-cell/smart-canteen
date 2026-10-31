requireLogin();
const cols = document.querySelectorAll('.board .col');
const statEls = document.querySelectorAll('.stat b');
 
const card = (o, actions) => `
  <div class="job"><header><b>${esc(o.orderId)}</b><span><span class="chip ${o.status}">${statusLabel(o.status)}</span>${o.late ? ' <span class="chip delayed">Late</span>' : ''}</span></header>
    <ul>${o.items.map((i) => `<li>${i.qty} × ${esc(i.name)}</li>`).join('')}
      <li>${esc(o.student?.name || '')} · pickup ${fmtTime(o.estimatedPickup)}</li></ul>${actions}</div>`;
 
const startBtn = (o) => `<button class="btn alt" data-id="${o.orderId}" data-status="preparing">Start preparing</button>`;
const readyBtn = (o) => `<button class="btn" data-id="${o.orderId}" data-status="ready">Mark as ready</button>
  <button class="btn ghost" style="margin-left:6px" data-id="${o.orderId}" data-status="delayed">Delay</button>`;
const verifyBtn = (o) => `<button class="btn alt" data-id="${o.orderId}" data-verify="1">Verify code</button>
  <button class="btn ghost" style="margin-left:6px" data-id="${o.orderId}" data-extend="1">+10 min</button>`;
 
async function load() {
  try {
    const [stats, orders] = await Promise.all([api('/admin/stats'), api('/admin/orders')]);
    [stats.total, stats.queued, stats.preparing, stats.ready].forEach((v, i) => (statEls[i].textContent = v));
 
    const groups = [
      orders.filter((o) => ['placed', 'queued', 'delayed'].includes(o.status)),
      orders.filter((o) => o.status === 'preparing'),
      orders.filter((o) => o.status === 'ready')
    ];
    const buttons = [startBtn, readyBtn, verifyBtn];
    cols.forEach((col, i) => {
      col.querySelectorAll('.job, :scope > p').forEach((el) => el.remove()); // clear old cards and old "Nothing here" notes
      col.querySelector('.chip').textContent = groups[i].length;
      col.insertAdjacentHTML('beforeend', groups[i].map((o) => card(o, buttons[i](o))).join('') || '<p style="color:#9fbdae">Nothing here.</p>');
    });
  } catch (e) { console.error(e); }
}
 
document.querySelector('.board').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  b.disabled = true;
  try {
    if (b.dataset.verify) { // generates the code and sends it to the student, then opens the verify page
      await api(`/admin/orders/${b.dataset.id}/send-otp`, { method: 'POST' });
      location.href = `verify.html?order=${b.dataset.id}&sent=1`;
      return;
    }
    if (b.dataset.extend) await api(`/admin/orders/${b.dataset.id}/extend`, { method: 'POST', body: { minutes: 10 } });
    else await api(`/admin/orders/${b.dataset.id}/status`, { method: 'PATCH', body: { status: b.dataset.status } });
  } catch (err) { alert(err.message); }
  load();
});
 
load();
setInterval(load, 10000);
 