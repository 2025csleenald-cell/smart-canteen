const { Station } = require('../models');

// Each station keeps an availableAt time. A new order goes to the station that frees up first.
exports.scheduleOrder = async (menuItems, requested) => {
  const now = new Date();
  const prepByStation = {};
  menuItems.forEach((m) => {
    prepByStation[m.stationType] = Math.max(prepByStation[m.stationType] || 0, m.prepTimeMins);
  });

  let latest = now, waited = false;
  const used = [];
  for (const [type, mins] of Object.entries(prepByStation)) {
    let list = await Station.find({ type });
    if (!list.length) list = await Station.find({ type: 'general' });
    if (!list.length) throw new Error('No kitchen station configured. Run npm run seed.');

    const st = list.sort((a, b) => a.availableAt - b.availableAt)[0];
    const start = new Date(Math.max(now, st.availableAt));
    const ready = new Date(start.getTime() + mins * 60000);
    st.availableAt = ready;
    await st.save();

    if (start > now) waited = true;
    if (ready > latest) latest = ready;
    used.push(st._id);
  }
  return {
    estimatedPickup: new Date(Math.max(latest, requested || 0)),
    status: waited ? 'queued' : 'placed',
    stations: used
  };
};
