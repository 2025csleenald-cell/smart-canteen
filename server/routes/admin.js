const router = require('express').Router();
const { Order, OtpRecord, MenuItem, Review } = require('../models');
const { createOtp, verifyOtp } = require('../services/otpService');
const { sendTemplate } = require('../services/whatsappService');
const { ah } = require('../middleware/auth');
 
const ACTIVE = ['placed', 'queued', 'preparing', 'ready', 'delayed'];
const NEXT = { placed: ['preparing'], queued: ['preparing'], delayed: ['preparing'], preparing: ['ready', 'delayed'] };
 
router.get('/orders', ah(async (req, res) => {
  const status = req.query.status ? req.query.status.split(',') : ACTIVE;
  res.json(await Order.find({ status: { $in: status } }).populate('student', 'name phone').sort({ createdAt: 1 }));
}));
 
router.get('/stats', ah(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const count = (f) => Order.countDocuments(f);
  const [total, queued, preparing, ready] = await Promise.all([
    count({ createdAt: { $gte: today } }),
    count({ status: { $in: ['placed', 'queued'] } }),
    count({ status: 'preparing' }),
    count({ status: 'ready' })
  ]);
  res.json({ total, queued, preparing, ready });
}));
 
router.patch('/orders/:orderId/status', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId }).populate('student', 'phone');
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  const { status } = req.body;
  if (!(NEXT[order.status] || []).includes(status))
    return res.status(400).json({ message: `Cannot move an order from ${order.status} to ${status}.` });
 
  order.status = status;
  if (status === 'ready') {
    order.readyAt = new Date();
    const mins = process.env.PICKUP_WINDOW_MINUTES || 60;
    sendTemplate(order.student.phone, 'order_ready', [order.orderId, 'Counter 1', mins], {
      fallback: `Your food is ready!\nOrder ID: ${order.orderId}\nPickup at: Counter 1\nPlease collect within ${mins} minutes.`
    });
  }
  if (status === 'delayed')
    sendTemplate(order.student.phone, 'order_update', [order.orderId, "it is running a little late. We will message you when it is ready."], {
      fallback: `Order ${order.orderId} is running a little late. We'll message you when it's ready.`
    });
  await order.save();
  res.json(order);
}));
 
// The code is created when staff press Verify. It goes to the student, who reads it out at the counter.
router.post('/orders/:orderId/send-otp', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: String(req.params.orderId).toUpperCase() }).populate('student', 'phone');
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.status !== 'ready') return res.status(400).json({ message: `Order is ${order.status}, not ready for pickup.` });
  const blocked = await OtpRecord.findOne({ order: order._id, used: false, blockedUntil: { $gt: new Date() } });
  if (blocked) return res.status(429).json({ message: 'Too many wrong attempts. Try again in a few minutes.' });
 
  const otp = await createOtp(order);
  sendTemplate(order.student.phone, 'pickup_otp', [otp], { otp, fallback: `Your pickup OTP for ${order.orderId}: ${otp}` });
  res.json({ message: 'Code sent to the student. Ask them to read it out.' });
}));
 
router.post('/orders/:orderId/verify-otp', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: String(req.params.orderId).toUpperCase() });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.status !== 'ready') return res.status(400).json({ message: `Order is ${order.status}, not ready for pickup.` });
 
  const r = await verifyOtp(order, req.body.otp);
  if (!r.ok) return res.status(r.code).json({ message: r.message });
  order.status = 'collected';
  order.collectedAt = new Date();
  await order.save();
  res.json({ message: 'Verified. Hand over the order.', order });
}));
 
// Late pickup: give the student more time
router.post('/orders/:orderId/extend', ah(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId }).populate('student', 'phone');
  if (!order || !['ready', 'pickup_expired'].includes(order.status))
    return res.status(400).json({ message: 'Only ready or expired orders can be extended.' });
  const mins = Math.min(Number(req.body.minutes) || 10, 60);
  await OtpRecord.updateOne({ order: order._id, used: false }, { expiresAt: new Date(Date.now() + mins * 60000), blockedUntil: null });
  order.status = 'ready';
  order.readyAt = new Date(Date.now() + mins * 60000 - (Number(process.env.PICKUP_WINDOW_MINUTES) || 60) * 60000); // restarts the pickup window
  await order.save();
  sendTemplate(order.student.phone, 'order_update', [order.orderId, `your pickup window was extended by ${mins} minutes.`], {
    fallback: `Order ${order.orderId}: your pickup window was extended by ${mins} minutes.`
  });
  res.json(order);
}));
 
// ---------- Dish photos ----------
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const UPLOAD_DIR = path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]) // random name, fixed extension
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG or WebP images are allowed.')))
});
const removeFile = (url) => { if (url && url.startsWith('/uploads/')) fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {}); };
 
router.post('/menu/:id/image',
  (req, res, next) => upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 2 MB.' : err.message });
    next();
  }),
  ah(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Choose an image first.' });
    const item = await MenuItem.findById(req.params.id);
    if (!item) { removeFile('/uploads/' + req.file.filename); return res.status(404).json({ message: 'Dish not found.' }); }
    removeFile(item.image); // replace the old photo
    item.image = '/uploads/' + req.file.filename;
    await item.save();
    res.json(item);
  }));
 
// ---------- Reviews ----------
router.get('/reviews', ah(async (req, res) => {
  res.json(await Review.find().populate('student', 'name').populate('order', 'orderId').sort({ createdAt: -1 }).limit(100));
}));
 
// ---------- Menu management ----------
const CATEGORIES = ['Meals', 'Snacks', 'Drinks', 'Desserts'];
const STATIONS = ['grill', 'juice', 'general'];
 
function cleanItem(b) {
  const d = {};
  if (b.name !== undefined) d.name = String(b.name).trim();
  if (b.price !== undefined) d.price = Number(b.price);
  if (b.category !== undefined) d.category = b.category;
  if (b.emoji !== undefined) d.emoji = String(b.emoji).trim().slice(0, 4) || '🍽️';
  if (b.prepTimeMins !== undefined) d.prepTimeMins = Number(b.prepTimeMins);
  if (b.stationType !== undefined) d.stationType = b.stationType;
  if (b.available !== undefined) d.available = Boolean(b.available);
  return d;
}
 
function checkItem(d, isNew) {
  if ((isNew || 'name' in d) && !d.name) return 'Dish name is required.';
  if ((isNew || 'price' in d) && !(d.price >= 0 && d.price <= 100000)) return 'Enter a valid price.';
  if ((isNew || 'category' in d) && !CATEGORIES.includes(d.category)) return 'Pick a category.';
  if ((isNew || 'prepTimeMins' in d) && !(d.prepTimeMins >= 1 && d.prepTimeMins <= 120)) return 'Prep time must be 1 to 120 minutes.';
  if ('stationType' in d && !STATIONS.includes(d.stationType)) return 'Pick a valid station.';
  return null;
}
 
router.get('/menu', ah(async (req, res) => {
  res.json(await MenuItem.find().sort({ category: 1, name: 1 })); // includes hidden items
}));
 
router.post('/menu', ah(async (req, res) => {
  const d = cleanItem(req.body);
  const err = checkItem(d, true);
  if (err) return res.status(400).json({ message: err });
  res.status(201).json(await MenuItem.create(d));
}));
 
router.patch('/menu/:id', ah(async (req, res) => {
  const d = cleanItem(req.body);
  const err = checkItem(d, false);
  if (err) return res.status(400).json({ message: err });
  const item = await MenuItem.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!item) return res.status(404).json({ message: 'Dish not found.' });
  res.json(item);
}));
 
router.delete('/menu/:id', ah(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id); // past orders keep their own copy of name and price
  if (!item) return res.status(404).json({ message: 'Dish not found.' });
  removeFile(item.image);
  res.json({ message: 'Dish deleted.' });
}));
 
module.exports = router;
 
