requireLogin();
const box = document.getElementById('reviews');
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
 
api('/admin/reviews').then((list) => {
  if (list.length) {
    const avg = (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1);
    document.getElementById('summary').textContent = `Student reviews · ${avg} ★ average (${list.length})`;
  }
  box.innerHTML = list.length ? list.map((r) => `
    <div class="mrow"><div class="info">
      <b style="color:var(--turmeric)">${stars(r.rating)}</b>
      <small> ${esc(r.student?.name || 'Student')} · ${esc(r.order?.orderId || '')} · ${new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small><br>
      ${r.comment ? esc(r.comment) : '<small>No comment</small>'}
    </div></div>`).join('') : '<p>No reviews yet.</p>';
}).catch((e) => (box.innerHTML = `<p>${esc(e.message)}</p>`));
 