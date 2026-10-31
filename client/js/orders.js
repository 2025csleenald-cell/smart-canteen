requireLogin();
const list = document.getElementById('orderList');
let hasReady = false;
const drafts = {}; // unsent review text and stars, so the 15-second refresh doesn't erase them
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
 
function reviewBox(o) {
  if (o.status !== 'collected') return '';
  if (o.review) return `<hr><small>Your review</small><div class="starline">${stars(o.review.rating)}</div><small>${esc(o.review.comment)}</small>`;
  if (new Date() < new Date(o.reviewableAt)) return `<hr><small>You can review this order at ${fmtTime(o.reviewableAt)}.</small>`;
  const d = drafts[o.orderId] || { rating: 0, comment: '' };
  return `<hr><b>How was your order?</b>
    <div class="stars" data-order="${o.orderId}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= d.rating ? 'on' : ''}" aria-label="${n} stars">★</button>`).join('')}</div>
    <textarea rows="3" maxlength="500" placeholder="Tell us what you liked (optional)" data-comment="${o.orderId}">${esc(d.comment)}</textarea>
    <button class="btn" style="margin-top:10px;padding:9px 18px" data-review="${o.orderId}">Submit review</button>`;
}
 
const ticket = (o) => `
  <div class="ticket" style="transform:none;max-width:none">
    <div style="display:flex;justify-content:space-between"><small>Order</small><span class="chip ${o.status === 'pickup_expired' ? 'cancelled' : o.status}">${statusLabel(o.status)}</span></div>
    <div class="big">${esc(o.orderId)}</div>
    <ul>${o.items.map((i) => `<li><span>${esc(i.name)}</span><span>×${i.qty}</span></li>`).join('')}</ul>
    <hr>
    <small>Total ₹${o.total} · ${['collected', 'cancelled', 'pickup_expired'].includes(o.status) ? 'Placed ' + fmtTime(o.createdAt) : 'Est. pickup ' + fmtTime(o.estimatedPickup)}</small>
    ${o.late && ['placed', 'queued', 'preparing', 'delayed'].includes(o.status)
      ? `<p class="sorry"><b>Sorry for the delay!</b> Your order is taking longer than expected. We've updated your pickup time to <b>${fmtTime(o.estimatedPickup)}</b>.</p>` : ''}
    ${o.status === 'ready' ? (o.otp
      ? `<p style="margin-top:12px"><b>Your food is ready!</b> Read this code out to the counter staff:</p><div class="big" style="text-align:center">${esc(o.otp)}</div><small>Valid until ${fmtTime(o.otpExpiresAt)}</small>`
      : '<p style="margin-top:10px"><b>Your food is ready!</b> Go to the counter. When staff press Verify, your 6-digit code is sent to your WhatsApp. Read it out to them.</p>') : ''}
    ${['placed', 'queued'].includes(o.status) ? `<button class="btn ghost" style="margin-top:14px;padding:9px 18px" data-cancel="${o.orderId}">Cancel order</button>` : ''}
    ${reviewBox(o)}
  </div>`;
 
async function load() {
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return; // don't redraw while typing
  try {
    const orders = await api('/orders/my');
    hasReady = orders.some((o) => o.status === 'ready');
    list.innerHTML = orders.length ? orders.map(ticket).join('') : '<p>No orders yet. <a href="menu.html"><b>Browse the menu</b></a></p>';
  } catch (e) { list.innerHTML = `<p>${esc(e.message)}</p>`; }
}
 
list.addEventListener('click', async (e) => {
  const cancelId = e.target.dataset.cancel;
  if (cancelId && confirm('Cancel order ' + cancelId + '?')) {
    try { await api(`/orders/${cancelId}/cancel`, { method: 'PATCH' }); load(); } catch (err) { alert(err.message); }
    return;
  }
  const star = e.target.closest('button[data-star]');
  if (star) {
    const id = star.parentElement.dataset.order;
    drafts[id] = { ...(drafts[id] || { comment: '' }), rating: Number(star.dataset.star) };
    star.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= drafts[id].rating));
    return;
  }
  const rid = e.target.dataset.review;
  if (rid) {
    const d = drafts[rid];
    if (!d || !d.rating) return alert('Tap the stars to rate your order first.');
    try {
      await api(`/orders/${rid}/review`, { method: 'POST', body: { rating: d.rating, comment: d.comment } });
      delete drafts[rid];
      load();
    } catch (err) { alert(err.message); }
  }
});
 
list.addEventListener('input', (e) => {
  const id = e.target.dataset.comment;
  if (id) drafts[id] = { ...(drafts[id] || { rating: 0 }), comment: e.target.value };
});
 
(async function tick() {
  await load();
  setTimeout(tick, hasReady ? 5000 : 15000); // check faster while a ready order is waiting for its code
})();
 