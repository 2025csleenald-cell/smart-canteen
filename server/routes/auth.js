const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ah } = require('../middleware/auth');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: u.role === 'admin' ? '8h' : '7d' });

const loginAs = (role) => ah(async (req, res) => {
  const id = String(req.body.identifier || '').trim().toLowerCase();
  const user = await User.findOne({ role, $or: [{ email: id }, { phone: id }] });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash)))
    return res.status(401).json({ message: 'Invalid email/phone or password.' });
  res.json({ token: sign(user), user: { name: user.name, role: user.role } });
});

router.post('/register', ah(async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Fill in all fields. Password needs at least 6 characters.' });
  try {
    await User.create({ name, phone: String(phone).trim(), email, passwordHash: await bcrypt.hash(password, 10), role: 'student' });
    res.status(201).json({ message: 'Account created. You can log in now.' });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'That email or phone is already registered.' });
    throw e;
  }
}));

router.post('/student/login', loginAs('student'));
router.post('/admin/login', loginAs('admin'));
module.exports = router;
