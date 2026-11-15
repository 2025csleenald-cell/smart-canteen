const router = require('express').Router();
const { MenuItem, Order, Counter, User, Review } = require('../models');
const { scheduleOrder } = require('../services/queueService');
const { readOtp } = require('../services/otpService');
const { currentSlot } = require('../services/menuTimeService');
const { sendTemplate } = require('../services/whatsappService');
const { ah } = require('../middleware/auth');

const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// Accepts "HH:MM" (today) or a full ISO date
function parsePickup(v) {
  if (!v) return null;
  if (/^\d{2}:\d{2}$/.test(v)) {
    const d = new Date(); const [h, m] = v.split(':'); d.setHours(+h, +m, 0, 0); return d;
  }
  const d = new Date(v); return isNaN(d) ? null : d;
}

router.post('/', ah(async (req, res) => {
  const { items, pickupTime } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Your order is empty.' });

  const menu = await MenuItem.find({ _id: { $in: items.map((i) => i.id) }, available: true });
  const lines = [];
  for (const i of items) {
    const m = menu.find((x) => String(x._id) === String(i.id));
    const qty = Math.floor(Number(i.qty));
    if (!m || !(qty > 0 && qty <= 10)) return res.status(400).json({ message: 'One of the items is unavailable or has a bad quantity.' });
    lines.push({ item: m._id, name: m.name, price: m.price, qty });
  }

  const { open, current } = await currentSlot();
  if (!open) return res.status(400).json({ message: 'The canteen is closed right now. Please order when it opens.' });
  const offMenu = menu.filter((m) => !m.slots.includes(current.key));
  if (offMenu.length)
    return res.status(400).json({ message: `${offMenu.map((m) => m.name).join(', ')} ${offMenu.length > 1 ? 'are' : 'is'} not on the ${current.label.toLowerCase()} menu right now. Please remove ${offMenu.length > 1 ? 'them' : 'it'} and try again.` });

  const requested = parsePickup(pickupTime);
  const plan = await scheduleOrder(menu, requested);
  const counter = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { new: true, upsert: true });

  const order = await Order.create({
    orderId: 'CAN' + counter.seq,
    student: req.user.id,
    items: lines,
    total: lines.reduce((s, l) => s + l.price * l.qty, 0),
    pickupTimeRequested: requested,
    estimatedPickup: plan.estimatedPickup,
    stations: plan.stations,
    status: plan.status
  });

  const student = await User.findById(req.user.id);
  const itemsText = lines.map((l) => `${l.name} x${l.qty}`).join(', ');
  sendTemplate(student.phone, 'order_confirmed', [order.orderId, itemsText, fmt(order.estimatedPickup)], {
    fallback: `Your order has been confirmed!\nOrder ID: ${order.orderId}\nItems: ${itemsText}\nEst. pickup: ${fmt(order.estimatedPickup)}\nThank you!`
  });

  res.status(201).json(order);
}));

router.get('/my', ah(async (req, res) => {
  const orders = await Order.find({ student: req.user.id }).sort({ createdAt: -1 }).limit(30).lean();
  // The code is only shown in the app if SHOW_OTP_IN_APP=true; otherwise students get it on WhatsApp
  const ready = process.env.SHOW_OTP_IN_APP === 'true' ? orders.filter((o) => o.status === 'ready') : [];
  const codes = await Promise.all(ready.map((o) => readOtp(o._id)));
  ready.forEach((o, i) => Object.assign(o, codes[i] || {})); // adds otp + otpExpiresAt to ready orders only
  // Review window: opens REVIEW_DELAY_MINUTES (default 60) after the order was collected
  const delay = (Number(process.env.REVIEW_DELAY_MINUTES) || 60) * 60000;
  const done = orders.filter((o) => o.status === 'collected');
  const reviews = done.length ? await Review.find({ order: { $in: done.map((o) => o._id) } }).lean() : [];
  done.forEach((o) => {
    const r = reviews.find((x) => String(x.order) === String(o._id));
    o.review = r ? { rating: r.rating, comment: r.comment } : null;
    o.reviewableAt = new Date(new Date(o.collectedAt || o.updatedAt).getTime() + delay);
  });
  res.json(orders);
}));

router.patch('/:orderId/cancel', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, student: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!['placed', 'queued'].includes(order.status))
    return res.status(400).json({ message: 'This order is already being prepared and cannot be cancelled.' });
  order.status = 'cancelled';
  await order.save();
  res.json(order);
}));

router.post('/:orderId/review', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId, student: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.status !== 'collected') return res.status(400).json({ message: 'You can review an order after you have collected it.' });

  const delay = (Number(process.env.REVIEW_DELAY_MINUTES) || 60) * 60000;
  const opensAt = new Date(new Date(order.collectedAt || order.updatedAt).getTime() + delay);
  if (new Date() < opensAt) return res.status(400).json({ message: `Reviews open at ${fmt(opensAt)}.` });

  const rating = Math.floor(Number(req.body.rating));
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ message: 'Pick a rating from 1 to 5 stars.' });
  try {
    await Review.create({ order: order._id, student: req.user.id, rating, comment: String(req.body.comment || '').trim().slice(0, 500) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'You already reviewed this order.' });
    throw e;
  }
  res.status(201).json({ message: 'Thanks for your review!' });
}));

module.exports = router;