const { Setting } = require('../models');

const SLOTS = [
  { key: 'morning', label: 'Morning breakfast' },
  { key: 'afternoon', label: 'Afternoon meals' },
  { key: 'evening', label: 'Evening snacks' }
];
const DEFAULTS = { morning: '06:00', afternoon: '12:00', evening: '16:00', closing: '18:30' }; // when each menu starts, and when the canteen closes

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Minutes since midnight in the canteen's time zone (not the server's)
const nowMinutes = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: process.env.TIMEZONE || 'Asia/Kolkata'
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get('hour') * 60 + get('minute');
};

// The canteen is open from the morning start until the closing time. In that time the current menu is
// the latest one whose start time has passed, and "next" is the menu after it (null = the canteen closes
// after this menu). Outside opening hours it is closed and "next" is the morning menu that opens it.
function pickSlot(timings, nowMin) {
  const list = SLOTS.map((s) => ({ ...s, time: timings[s.key], start: toMin(timings[s.key]) })).sort((a, b) => a.start - b.start);
  const closing = timings.closing;
  if (nowMin < list[0].start || nowMin >= toMin(closing)) return { open: false, current: null, next: list[0], closing };
  const current = [...list].reverse().find((s) => s.start <= nowMin);
  const next = list.find((s) => s.start > nowMin) || null;
  return { open: true, current, next, closing };
}

async function getTimings() {
  const s = await Setting.findById('menuTimings');
  return { ...DEFAULTS, ...((s && s.value) || {}) };
}

async function currentSlot() {
  const timings = await getTimings();
  return { ...pickSlot(timings, nowMinutes()), timings };
}

module.exports = { SLOTS, DEFAULTS, pickSlot, getTimings, currentSlot };