const mongoose = require('mongoose');

const failedPaymentSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true,
    index: true
  },
  errorCode: {
    type: String,
    required: true
  },
  errorDescription: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FailedPayment', failedPaymentSchema);