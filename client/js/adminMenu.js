requireLogin();
const $ = (id) => document.getElementById(id);
const form = $('itemForm'), list = $('items'), errBox = $('error');
const SLOTS = ['morning', 'afternoon', 'evening'];
const SLOT_NAME = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
let items = [], editingId = null, filter = 'all', nowSlot = null;

const slotsOf = (m) => (m.slots && m.slots.length ? m.slots : SLOTS);

const row = (m) => `
  <div class="mrow ${m.available ? '' : 'off'}">
    <span class="em">${m.image ? `<img src="${esc(m.image)}" alt="">` : esc(m.emoji)}</span>
    <div class="info"><b>${esc(m.name)}</b> ${m.available ? '' : '<span class="chip cancelled">Hidden</span>'}<br>
      <small>₹${m.price} · ${esc(m.category)} · ${m.prepTimeMins} min · ${esc(m.stationType)}</small><br>
      ${slotsOf(m).map((s) => `<span class="chip s-${s}">${SLOT_NAME[s]}</span>`).join(' ')}</div>
    <div class="acts">
      <button class="btn alt" data-id="${m._id}" data-act="edit">Edit</button>
      <button class="btn ghost" data-id="${m._id}" data-act="toggle">${m.available ? 'Hide' : 'Show'}</button>
      <button class="btn" data-id="${m._id}" data-act="delete">Delete</button>
    </div>
  </div>`;

function render() {
  const shown = filter === 'all' ? items : items.filter((m) => slotsOf(m).includes(filter));
  list.innerHTML = shown.length ? shown.map(row).join('') : '<p>No dishes for this time of day yet. Add one with the form.</p>';
  document.querySelectorAll('#slotFilter button').forEach((b) => {
    b.classList.toggle('on', b.dataset.slot === filter);
    if (b.dataset.slot !== 'all') b.textContent = SLOT_NAME[b.dataset.slot] + (b.dataset.slot === nowSlot ? ' (showing now)' : '');
  });
}

async function load() {
  try { items = await api('/admin/menu'); render(); } catch (e) { list.innerHTML = `<p>${esc(e.message)}</p>`; }
}

async function loadTimings() {
  try {
    const t = await api('/admin/menu-timings');
    [...SLOTS, 'closing'].forEach((k) => ($('t-' + k).value = t.timings[k]));
    nowSlot = t.current;
    $('nowNote').textContent = t.open
      ? `Students are seeing the ${t.labels[t.current]} menu right now. The canteen closes at ${t.timings.closing}.`
      : 'The canteen is closed right now, so students cannot order. Change the closing time if you want to test late.';
    render();
  } catch (e) { $('timingsMsg').textContent = e.message; }
}

function resetForm() {
  editingId = null;
  form.reset(); // also ticks all three times of day again
  $('f-prep').value = 5;
  $('formTitle').textContent = 'Add a dish';
  $('saveBtn').textContent = 'Add dish';
  $('cancelEdit').hidden = true;
  errBox.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
  const slots = SLOTS.filter((k) => $('f-slot-' + k).checked);
  if (!slots.length) return (errBox.textContent = 'Pick at least one time of day.');
  const body = {
    name: $('f-name').value, price: $('f-price').value, category: $('f-category').value,
    emoji: $('f-emoji').value, prepTimeMins: $('f-prep').value, stationType: $('f-station').value,
    available: $('f-available').checked, slots
  };
  try {
    const saved = await api(editingId ? `/admin/menu/${editingId}` : '/admin/menu', { method: editingId ? 'PATCH' : 'POST', body });
    const file = $('f-image').files[0];
    if (file) {
      editingId = saved._id; // if the upload fails, a retry updates this dish instead of creating a duplicate
      const fd = new FormData();
      fd.append('image', file);
      await apiUpload(`/admin/menu/${saved._id}/image`, fd);
    }
    resetForm();
    load();
  } catch (err) { errBox.textContent = err.message; load(); }
});

$('cancelEdit').onclick = resetForm;

$('timingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('timingsMsg');
  msg.style.color = '';
  msg.textContent = '';
  try {
    await api('/admin/menu-timings', { method: 'PUT', body: { morning: $('t-morning').value, afternoon: $('t-afternoon').value, evening: $('t-evening').value, closing: $('t-closing').value } });
    msg.style.color = 'var(--ok)';
    msg.textContent = '✔ Timings saved. Students see the change within a minute.';
    loadTimings();
  } catch (err) { msg.textContent = err.message; }
});

$('slotFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-slot]');
  if (!b) return;
  filter = b.dataset.slot;
  render();
});

list.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const item = items.find((m) => m._id === b.dataset.id);
  try {
    if (b.dataset.act === 'edit') {
      editingId = item._id;
      $('f-name').value = item.name; $('f-price').value = item.price; $('f-category').value = item.category;
      $('f-emoji').value = item.emoji; $('f-prep').value = item.prepTimeMins; $('f-station').value = item.stationType;
      $('f-available').checked = item.available;
      SLOTS.forEach((k) => ($('f-slot-' + k).checked = slotsOf(item).includes(k)));
      $('formTitle').textContent = 'Edit dish';
      $('saveBtn').textContent = 'Save changes';
      $('cancelEdit').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (b.dataset.act === 'toggle') {
      await api(`/admin/menu/${item._id}`, { method: 'PATCH', body: { available: !item.available } });
      load();
    } else if (b.dataset.act === 'delete' && confirm(`Delete "${item.name}"? Past orders are not affected.`)) {
      await api(`/admin/menu/${item._id}`, { method: 'DELETE' });
      load();
    }
  } catch (err) { alert(err.message); }
});

load();
loadTimings();