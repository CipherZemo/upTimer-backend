const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Razorpay subscription details
    razorpaySubscriptionId: {
      type: String,
      unique: true,
      sparse: true, // Allow null for free tier
    },
    razorpayPlanId: {
      type: String,
    },
    razorpayCustomerId: {
      type: String,
    },

    // Subscription info
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'paused'],
      default: 'active',
    },

    // Billing details
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    // Payment history
    lastPaymentDate: {
      type: Date,
    },
    lastPaymentAmount: {
      type: Number,
    },
    lastPaymentStatus: {
      type: String,
      enum: ['succeeded', 'failed', 'pending'],
    },
  },
  {
    timestamps: true,
  }
);

// Index for expiry checks
subscriptionSchema.index({ currentPeriodEnd: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);