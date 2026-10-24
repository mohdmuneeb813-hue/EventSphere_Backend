const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
  expo: { type: mongoose.Schema.Types.ObjectId, ref: 'Expo', required: true },
  exhibitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  boothNumber: { type: String, required: true },
  category: { type: String, required: true }, // e.g., Tech, Food, Clothing
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Booth', boothSchema);