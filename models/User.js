const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'exhibitor', 'attendee'], 
    default: 'attendee' 
  },
  companyDetails: {
    companyName: { type: String },
    productsOrServices: { type: String },
    description: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);