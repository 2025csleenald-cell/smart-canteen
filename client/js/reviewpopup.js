(function () {
  if (!localStorage.getItem('studentToken')) return;
  const SKIP_KEY = 'reviewSkipped'; // orders the student chose to skip for good
  const skipped = () => { try { return JSON.parse(localStorage.getItem(SKIP_KEY) || '[]'); } catch { return []; } };
  const later = new Set(JSON.parse(sessionStorage.getItem('reviewLater') || '[]')); // hidden until the next visit
  let isOpen = false;
 
  async function check() {
    if (isOpen) return;
    try {
      const orders = await api('/orders/my');
      const due = orders.find((o) => o.status === 'collected' && !o.review && o.reviewableAt &&
        new Date(o.reviewableAt) <= new Date() && !skipped().includes(o.orderId) && !later.has(o.orderId));
      if (due) show(due);
    } catch (e) { /* stay quiet; the popup is optional */ }
  }
 
  function show(order) {
    isOpen = true;
    let rating = 0;
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
        <h2 id="rvTitle">How was your order?</h2>
        <p style="color:var(--mute);margin:6px 0 4px">${esc(order.orderId)} · ${order.items.map((i) => esc(i.name)).join(', ')}</p>
        <div class="stars" id="rvStars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} stars">★</button>`).join('')}</div>
        <textarea id="rvText" rows="3" maxlength="500" placeholder="Tell us what you liked (optional)"></textarea>
        <p class="err" id="rvErr" role="alert"></p>
        <button class="btn block" id="rvSend">Submit review</button>
        <div class="modal-links"><button type="button" id="rvLater">Not now</button><button type="button" id="rvSkip">Don't ask for this order</button></div>
      </div>`;
    document.body.appendChild(back);
    const $ = (id) => back.querySelector('#' + id);
 
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); isOpen = false; };
    const onKey = (e) => { if (e.key === 'Escape') notNow(); };
    const notNow = () => { later.add(order.orderId); sessionStorage.setItem('reviewLater', JSON.stringify([...later])); close(); };
    document.addEventListener('keydown', onKey);
 
    $('rvStars').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-star]');
      if (!b) return;
      rating = Number(b.dataset.star);
      $('rvStars').querySelectorAll('button').forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= rating));
    });
    $('rvLater').onclick = notNow;
    $('rvSkip').onclick = () => { localStorage.setItem(SKIP_KEY, JSON.stringify([...skipped(), order.orderId])); close(); };
    $('rvSend').onclick = async () => {
      if (!rating) return ($('rvErr').textContent = 'Tap the stars to rate your order.');
      $('rvSend').disabled = true;
      try {
        await api(`/orders/${order.orderId}/review`, { method: 'POST', body: { rating, comment: $('rvText').value } });
        back.querySelector('.modal').innerHTML = '<h2>Thank you!</h2><p style="margin-top:8px">Your review helps us improve the canteen.</p>';
        setTimeout(close, 1600);
      } catch (err) {
        $('rvErr').textContent = err.message;
        $('rvSend').disabled = false;
      }
    };
    $('rvStars').querySelector('button').focus();
  }
 
  check();
  setInterval(check, 60000); // so it appears by itself when the hour is up
})();
 