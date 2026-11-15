require('dotenv').config();
const mongoose = require('mongoose');
const { MenuItem } = require('../models');
const menu = require('./menuData');

// Adds the sample Indian menu without touching dishes you already edited.
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  let added = 0, tagged = 0;
  for (const dish of menu) {
    const { name, ...rest } = dish;
    // An existing dish with no time-of-day setting gets the sample one
    tagged += (await MenuItem.updateOne({ name, slots: { $exists: false } }, { $set: { slots: dish.slots } })).modifiedCount;
    // A dish that doesn't exist yet is added
    added += (await MenuItem.updateOne({ name }, { $setOnInsert: rest }, { upsert: true })).upsertedCount;
  }
  console.log(`Added ${added} new dishes. Set the time of day on ${tagged} existing dishes.`);
  process.exit();
})();