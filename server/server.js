require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { requireAuth } = require('./middleware/auth');
 
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 
app.use('/api/auth/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/student/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
 
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', requireAuth('student'), require('./routes/orders'));
app.use('/api/admin', requireAuth('admin'), require('./routes/admin'));
 
app.use(express.static(path.join(__dirname, '../client')));
 
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
 
connectDB().then(() => {
  require('./jobs/expiryJob')();
  require('./jobs/delayJob')();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Smart Canteen running at http://localhost:${port}`));
});
 