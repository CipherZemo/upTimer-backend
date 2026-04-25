const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'INR',
    interval: 'monthly',
    features: {
      maxChecks: 5,
      minInterval: 5, // minutes
      emailAlerts: true,
      webhookAlerts: false,
      apiAccess: false,
      support: 'community',
    },
  },
  pro: {
    name: 'Pro',
    price: 49900, // ₹499 in paise
    currency: 'INR',
    interval: 'monthly',
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID, // Will create this
    features: {
      maxChecks: 50,
      minInterval: 1,
      emailAlerts: true,
      webhookAlerts: true,
      apiAccess: true,
      support: 'email',
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 199900, // ₹1999 in paise
    currency: 'INR',
    interval: 'monthly',
    razorpayPlanId: process.env.RAZORPAY_ENTERPRISE_PLAN_ID,
    features: {
      maxChecks: -1, // Unlimited
      minInterval: 1,
      emailAlerts: true,
      webhookAlerts: true,
      apiAccess: true,
      support: 'priority',
    },
  },
};

module.exports = {
  razorpayInstance,
  SUBSCRIPTION_PLANS,
};