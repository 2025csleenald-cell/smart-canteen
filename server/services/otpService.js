const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OtpRecord } = require('../models');
 
const MAX_ATTEMPTS = 3, BLOCK_MINUTES = 5;
 
// AES-256-GCM encryption so the code is never stored as plain text
const key = () => crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
const seal = (text) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('hex')).join(':');
};
const unseal = (s) => {
  const [iv, tag, enc] = s.split(':').map((h) => Buffer.from(h, 'hex'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
};
 
// Returns the active code for an order (for the student's own orders page), or null
exports.readOtp = async (orderId) => {
  const rec = await OtpRecord.findOne({ order: orderId, used: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  if (!rec || !rec.otpEnc) return null;
  try { return { otp: unseal(rec.otpEnc), otpExpiresAt: rec.expiresAt }; } catch { return null; }
};
 
exports.createOtp = async (orderDoc) => {
  await OtpRecord.deleteMany({ order: orderDoc._id });
  const otp = crypto.randomInt(100000, 1000000).toString();
  await OtpRecord.create({
    order: orderDoc._id,
    otpHash: await bcrypt.hash(otp, 8),
    otpEnc: seal(otp),
    expiresAt: new Date(Date.now() + (Number(process.env.OTP_MINUTES) || 15) * 60000)
  });
  return otp; // sent to the student, never stored in plain text
};
 
exports.verifyOtp = async (orderDoc, otp) => {
  const rec = await OtpRecord.findOne({ order: orderDoc._id, used: false }).sort({ createdAt: -1 });
  if (!rec) return { ok: false, code: 404, message: 'No active code. Press "Send code to student" first.' };
  if (rec.blockedUntil && rec.blockedUntil > new Date())
    return { ok: false, code: 429, message: 'Too many wrong attempts. Try again in a few minutes.' };
  if (rec.expiresAt < new Date())
    return { ok: false, code: 410, message: 'This code has expired. Extend pickup or cancel the order.' };
 
  if (!(await bcrypt.compare(String(otp), rec.otpHash))) {
    rec.attempts += 1;
    if (rec.attempts >= MAX_ATTEMPTS) {
      rec.blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60000);
      rec.attempts = 0;
    }
    await rec.save();
    return { ok: false, code: 400, message: 'Wrong code. Please try again.' };
  }
  rec.used = true;
  await rec.save();
  return { ok: true };
};
 