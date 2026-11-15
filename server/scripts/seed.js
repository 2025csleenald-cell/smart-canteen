require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, MenuItem, Station } = require('../models');
const sampleMenu = require('./menuData');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (!(await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() }))) {
    await User.create({
      name: 'Canteen Admin', email: process.env.ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10), role: 'admin'
    });
    console.log('Admin created:', process.env.ADMIN_EMAIL);
  }

  if (!(await Station.countDocuments())) {
    await Station.insertMany([
      { name: 'Grill 1', type: 'grill' }, { name: 'Grill 2', type: 'grill' },
      { name: 'Juice Bar', type: 'juice' }, { name: 'Main Kitchen', type: 'general' }
    ]);
    console.log('Stations created');
  }

  if (!(await MenuItem.countDocuments())) {
    await MenuItem.insertMany(sampleMenu);
    console.log('Menu created');
  }
  process.exit();
})();