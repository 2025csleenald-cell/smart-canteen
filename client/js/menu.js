requireLogin();

const grid = document.getElementById('menuGrid');
const drawer = document.getElementById('drawer');
let items = [], category = 'All', slot = null;
const cart = {}; // menu item id -> quantity

const TITLES = {
  morning: 'Start your day with a hot breakfast',
  afternoon: 'Lunch is served',
  evening: 'Evening snacks and chai',
  closed: "We're closed right now"
};
const fmt12 = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

const dishHTML = (m) => `
  <article class="dish"><div class="pic">${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy">` : esc(m.emoji)}</div>
    <div class="body"><h3>${esc(m.name)}</h3><span class="meta">Ready in about ${m.prepTimeMins} min</span>
      <div class="foot"><span class="price">₹${m.price}</span>
        <div class="qty"><button data-id="${m._id}" data-d="-1" aria-label="Remove one">−</button><b>${cart[m._id] || 0}</b><button data-id="${m._id}" data-d="1" aria-label="Add one">+</button></div>
      </div></div></article>`;

function render() {
  const list = category === 'All' ? items : items.filter((m) => m.category === category);
  grid.innerHTML = list.length ? list.map(dishHTML).join('') : (slot === 'closed' ? '<p>The canteen is closed right now. Please come back when it opens.</p>' : '<p>Nothing here right now.</p>');
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

// The menu changes by time of day, so it is reloaded every minute
async function loadMenu() {
  const data = await api('/menu');
  const state = data.open ? data.slot : 'closed';
  const changed = slot !== null && slot !== state;
  slot = state;
  items = data.items;

  document.getElementById('slotLabel').textContent = data.label;
  document.getElementById('menuTitle').textContent = TITLES[state];
  document.getElementById('slotNote').textContent = !data.open
    ? `Opens at ${fmt12(data.opensAt)} with the ${data.nextLabel.toLowerCase()} menu`
    : data.until ? `Menu changes to ${data.nextLabel.toLowerCase()} at ${fmt12(data.until)}` : `Canteen closes at ${fmt12(data.closing)}`;
  document.querySelector('.cartbar').style.display = data.open ? '' : 'none';
  if (!data.open) drawer.hidden = true;

  // anything in the cart that is no longer on the menu is removed
  const gone = Object.keys(cart).filter((id) => !items.some((m) => m._id === id));
  gone.forEach((id) => delete cart[id]);
  if (changed) toast(!data.open ? 'The canteen has closed.' : `The menu has changed to ${data.label.toLowerCase()}.` + (gone.length ? ' Items that are no longer served were removed from your order.' : ''));
  else if (gone.length) toast('Some items in your order are no longer available and were removed.');
  render();
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
    loadMenu().catch(() => {}); // the menu may have just changed
  }
};

loadMenu().catch((e) => (grid.innerHTML = `<p>${esc(e.message)}</p>`));
setInterval(() => loadMenu().catch(() => {}), 60000);