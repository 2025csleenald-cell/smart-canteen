requireLogin();
 
const grid = document.getElementById('menuGrid');
const drawer = document.getElementById('drawer');
let items = [], category = 'All';
const cart = {}; // menu item id -> quantity
 
const dishHTML = (m) => `
  <article class="dish"><div class="pic">${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy">` : esc(m.emoji)}</div>
    <div class="body"><h3>${esc(m.name)}</h3><span class="meta">Ready in about ${m.prepTimeMins} min</span>
      <div class="foot"><span class="price">₹${m.price}</span>
        <div class="qty"><button data-id="${m._id}" data-d="-1" aria-label="Remove one">−</button><b>${cart[m._id] || 0}</b><button data-id="${m._id}" data-d="1" aria-label="Add one">+</button></div>
      </div></div></article>`;
 
function render() {
  const list = category === 'All' ? items : items.filter((m) => m.category === category);
  grid.innerHTML = list.length ? list.map(dishHTML).join('') : '<p>Nothing here yet.</p>';
  const lines = items.filter((m) => cart[m._id]);
  const count = lines.reduce((s, m) => s + cart[m._id], 0);
  const total = lines.reduce((s, m) => s + cart[m._id] * m.price, 0);
  cartCount.textContent = count + (count === 1 ? ' item' : ' items');
  cartTotal.textContent = total;
  cartLines.innerHTML = lines.length
    ? lines.map((m) => `<div class="line"><span>${cart[m._id]} × ${esc(m.name)}</span><b>₹${cart[m._id] * m.price}</b></div>`).join('')
    : '<p>Your order is empty.</p>';
  drawer.querySelector('.total span:last-child').textContent = '₹' + total;
}
 
grid.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const id = b.dataset.id;
  cart[id] = Math.min(10, Math.max(0, (cart[id] || 0) + Number(b.dataset.d)));
  if (!cart[id]) delete cart[id];
  render();
});
 
document.getElementById('categories').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  document.querySelectorAll('#categories button').forEach((x) => x.classList.remove('on'));
  b.classList.add('on');
  category = b.textContent.trim();
  render();
});
 
openCart.onclick = () => (drawer.hidden = false);
closeCart.onclick = () => (drawer.hidden = true);
 
// default pickup time: 20 minutes from now
const t = new Date(Date.now() + 20 * 60000);
pickup.value = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
 
placeOrder.onclick = async () => {
  const lines = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  if (!lines.length) return alert('Add at least one item first.');
  placeOrder.disabled = true;
  placeOrder.textContent = 'Placing order...';
  try {
    await api('/orders', { method: 'POST', body: { items: lines, pickupTime: pickup.value } });
    location.href = 'orders.html';
  } catch (err) {
    alert(err.message);
    placeOrder.disabled = false;
    placeOrder.textContent = 'Place order';
  }
};
 
api('/menu').then((data) => { items = data; render(); }).catch((e) => (grid.innerHTML = `<p>${esc(e.message)}</p>`));
 
