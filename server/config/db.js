
const mongoose = require('mongoose');
module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    // Removes the old phone-number index and adds the USN index
    try { await require('../models').User.syncIndexes(); } catch (e) { console.warn('Index update skipped:', e.message); }
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  }
};
