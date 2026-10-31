const cron = require('node-cron');
const { Order, OtpRecord } = require('../models');
 
// Every minute: a ready order that nobody collected within PICKUP_WINDOW_MINUTES becomes pickup_expired.
// Orders with a live (unused, unexpired) code are left alone while staff are handing them over.
module.exports = () => cron.schedule('* * * * *', async () => {
  try {
    const windowMs = (Number(process.env.PICKUP_WINDOW_MINUTES) || 60) * 60000;
    const stale = await Order.find({ status: 'ready', readyAt: { $lt: new Date(Date.now() - windowMs) } }).select('_id');
    if (!stale.length) return;
 
    const live = await OtpRecord.find({ order: { $in: stale.map((o) => o._id) }, used: false, expiresAt: { $gt: new Date() } }).select('order');
    const keep = new Set(live.map((r) => String(r.order)));
    const ids = stale.map((o) => o._id).filter((id) => !keep.has(String(id)));
    if (ids.length) await Order.updateMany({ _id: { $in: ids }, status: 'ready' }, { status: 'pickup_expired' });
  } catch (e) { console.error('Expiry job failed:', e.message); }
});