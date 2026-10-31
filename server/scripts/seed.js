require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, MenuItem, Station } = require('../models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (!(await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() }))) {
    await User.create({
      name: 'Canteen Admin', email: process.env.ADMIN_EMAIL, phone: process.env.ADMIN_PHONE,
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
    await MenuItem.insertMany([
      { name: 'Veg burger', price: 60, category: 'Snacks', emoji: '🍔', prepTimeMins: 8, stationType: 'grill' },
      { name: 'Masala fries', price: 50, category: 'Snacks', emoji: '🍟', prepTimeMins: 6, stationType: 'grill' },
      { name: 'Paneer rice bowl', price: 90, category: 'Meals', emoji: '🍛', prepTimeMins: 12, stationType: 'general' },
      { name: 'Veg thali', price: 110, category: 'Meals', emoji: '🍱', prepTimeMins: 10, stationType: 'general' },
      { name: 'Fresh juice', price: 40, category: 'Drinks', emoji: '🍹', prepTimeMins: 4, stationType: 'juice' },
      { name: 'Filter coffee', price: 25, category: 'Drinks', emoji: '☕', prepTimeMins: 3, stationType: 'juice' },
      { name: 'Chocolate brownie', price: 45, category: 'Desserts', emoji: '🍰', prepTimeMins: 2, stationType: 'general' }
    ]);
    console.log('Menu created');
  }
  process.exit();
})();
