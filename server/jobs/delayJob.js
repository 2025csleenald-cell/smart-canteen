const cron = require('node-cron');
const { Order, Station } = require('../models');
const { sendTemplate } = require('../services/whatsappService');
 
const fmt = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
 
// Every minute: if an order is still not ready after its estimated pickup time,
// move the estimate forward, mark it late, and (once) message the student with an apology.
module.exports = () => cron.schedule('* * * * *', async () => {
  try {
    const step = (Number(process.env.LATE_STEP_MINUTES) || 5) * 60000;
    const now = new Date();
    const late = await Order.find({
      status: { $in: ['placed', 'queued', 'preparing', 'delayed'] },
      estimatedPickup: { $lt: now }
    }).populate('student', 'phone');
 
    for (const o of late) {
      o.estimatedPickup = new Date(now.getTime() + step);
      o.late = true;
 
      // Keep the kitchen schedule honest: new orders now queue behind this late one
      await Station.updateMany({ _id: { $in: o.stations }, availableAt: { $lt: o.estimatedPickup } }, { availableAt: o.estimatedPickup });
 
      if (!o.lateNotified && o.student) {
        o.lateNotified = true; // only the first delay sends a message, so students are not spammed
        const text = `we are sorry, it is taking longer than expected. New estimated pickup time: ${fmt(o.estimatedPickup)}.`;
        sendTemplate(o.student.phone, 'order_update', [o.orderId, text], {
          fallback: `Order ${o.orderId}: Sorry for the delay! New estimated pickup time: ${fmt(o.estimatedPickup)}.`
        });
      }
      await o.save();
    }
  } catch (e) { console.error('Delay job failed:', e.message); }
});
 