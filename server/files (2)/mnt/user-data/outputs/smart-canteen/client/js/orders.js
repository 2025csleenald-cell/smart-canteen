requireLogin();
const list = document.getElementById('orderList');

const ticket = (o) => `
  <div class="ticket" style="transform:none;max-width:none">
    <div style="display:flex;justify-content:space-between"><small>Order</small><span class="chip ${o.status === 'pickup_expired' ? 'cancelled' : o.status}">${statusLabel(o.status)}</span></div>
    <div class="big">${esc(o.orderId)}</div>
    <ul>${o.items.map((i) => `<li><span>${esc(i.name)}</span><span>×${i.qty}</span></li>`).join('')}</ul>
    <hr>
    <small>Total ₹${o.total} · ${['collected', 'cancelled', 'pickup_expired'].includes(o.status) ? 'Placed ' + fmtTime(o.createdAt) : 'Est. pickup ' + fmtTime(o.estimatedPickup)}</small>
    ${o.status === 'ready' ? (o.otp
      ? `<p style="margin-top:12px"><b>Your food is ready!</b> Show this code at the counter:</p><div class="big" style="text-align:center">${esc(o.otp)}</div><small>Valid until ${fmtTime(o.otpExpiresAt)}</small>`
      : '<p style="margin-top:10px"><b>Your food is ready!</b> Ask the counter staff for help with your code.</p>') : ''}
    ${['placed', 'queued'].includes(o.status) ? `<button class="btn ghost" style="margin-top:14px;padding:9px 18px" data-cancel="${o.orderId}">Cancel order</button>` : ''}
  </div>`;

async function load() {
  try {
    const orders = await api('/orders/my');
    list.innerHTML = orders.length ? orders.map(ticket).join('') : '<p>No orders yet. <a href="menu.html"><b>Browse the menu</b></a></p>';
  } catch (e) { list.innerHTML = `<p>${esc(e.message)}</p>`; }
}

list.addEventListener('click', async (e) => {
  const id = e.target.dataset.cancel;
  if (!id || !confirm('Cancel order ' + id + '?')) return;
  try { await api(`/orders/${id}/cancel`, { method: 'PATCH' }); load(); } catch (err) { alert(err.message); }
});

load();
setInterval(load, 15000); // refresh status every 15 seconds
