requireLogin();
const $ = (id) => document.getElementById(id);
const form = $('itemForm'), list = $('items'), errBox = $('error');
let items = [], editingId = null;
 
function render() {
  list.innerHTML = items.length ? items.map((m) => `
    <div class="mrow ${m.available ? '' : 'off'}">
      <span class="em">${m.image ? `<img src="${esc(m.image)}" alt="">` : esc(m.emoji)}</span>
      <div class="info"><b>${esc(m.name)}</b> ${m.available ? '' : '<span class="chip cancelled">Hidden</span>'}<br>
        <small>₹${m.price} · ${esc(m.category)} · ${m.prepTimeMins} min · ${esc(m.stationType)}</small></div>
      <div class="acts">
        <button class="btn alt" data-id="${m._id}" data-act="edit">Edit</button>
        <button class="btn ghost" data-id="${m._id}" data-act="toggle">${m.available ? 'Hide' : 'Show'}</button>
        <button class="btn" data-id="${m._id}" data-act="delete">Delete</button>
      </div>
    </div>`).join('') : '<p>No dishes yet. Add your first one.</p>';
}
 
async function load() {
  try { items = await api('/admin/menu'); render(); } catch (e) { list.innerHTML = `<p>${esc(e.message)}</p>`; }
}
 
function resetForm() {
  editingId = null;
  form.reset();
  $('f-prep').value = 5;
  $('f-available').checked = true;
  $('formTitle').textContent = 'Add a dish';
  $('saveBtn').textContent = 'Add dish';
  $('cancelEdit').hidden = true;
  errBox.textContent = '';
}
 
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.textContent = '';
  const body = {
    name: $('f-name').value, price: $('f-price').value, category: $('f-category').value,
    emoji: $('f-emoji').value, prepTimeMins: $('f-prep').value, stationType: $('f-station').value,
    available: $('f-available').checked
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
 