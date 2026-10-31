const { Schema, model, Types } = require('mongoose');
 
const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
}, { timestamps: true }));
 
const MenuItem = model('MenuItem', new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['Meals', 'Snacks', 'Drinks', 'Desserts'], required: true },
  emoji: { type: String, default: '🍽️' },
  image: { type: String, default: '' },
  prepTimeMins: { type: Number, default: 5 },
  stationType: { type: String, default: 'general' },
  available: { type: Boolean, default: true }
}));
 
const Station = model('Station', new Schema({
  name: String,
  type: { type: String, default: 'general' },
  availableAt: { type: Date, default: () => new Date(0) }
}));
 
const Order = model('Order', new Schema({
  orderId: { type: String, unique: true },
  student: { type: Types.ObjectId, ref: 'User', required: true },
  items: [{ item: { type: Types.ObjectId, ref: 'MenuItem' }, name: String, price: Number, qty: Number }],
  total: Number,
  pickupTimeRequested: Date,
  estimatedPickup: Date,
  stations: [{ type: Types.ObjectId, ref: 'Station' }],
  status: {
    type: String, default: 'placed',
    enum: ['placed', 'queued', 'preparing', 'ready', 'collected', 'cancelled', 'delayed', 'pickup_expired']
  },
  readyAt: Date,
  collectedAt: Date,
  late: { type: Boolean, default: false },
  lateNotified: { type: Boolean, default: false }
}, { timestamps: true }));
 
const OtpRecord = model('OtpRecord', new Schema({
  order: { type: Types.ObjectId, ref: 'Order', required: true },
  otpHash: String,
  otpEnc: String, // encrypted copy so the student can see their code in the app
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  blockedUntil: Date
}, { timestamps: true }));
 
const Review = model('Review', new Schema({
  order: { type: Types.ObjectId, ref: 'Order', required: true, unique: true }, // one review per order
  student: { type: Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500, default: '' }
}, { timestamps: true }));
 
const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 1000 } }));
 
module.exports = { User, MenuItem, Station, Order, OtpRecord, Counter, Review };
 