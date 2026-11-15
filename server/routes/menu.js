const router = require('express').Router();
const { MenuItem } = require('../models');
const { currentSlot } = require('../services/menuTimeService');
const { ah } = require('../middleware/auth');

// The menu changes by time of day, and the canteen is closed outside opening hours
router.get('/', ah(async (req, res) => {
  const { open, current, next, closing } = await currentSlot();
  if (!open) {
    return res.json({ open: false, label: 'Canteen closed', opensAt: next.time, nextLabel: next.label, closing, items: [] });
  }
  const all = await MenuItem.find({ available: true }).sort({ category: 1, name: 1 });
  res.json({
    open: true,
    slot: current.key,
    label: current.label,
    nextLabel: next ? next.label : null,
    until: next ? next.time : null, // "HH:MM" when the next menu starts, or null if the canteen closes next
    closing,                         // "HH:MM" closing time
    items: all.filter((m) => m.slots.includes(current.key))
  });
}));
module.exports = router;