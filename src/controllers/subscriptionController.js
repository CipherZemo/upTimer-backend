const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { razorpayInstance, SUBSCRIPTION_PLANS } = require('../config/razorpay');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res, next) => {
  try {
    // Convert plan config to array for frontend
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features,
      priceDisplay: plan.price === 0 ? 'Free' : `₹${(plan.price / 100).toFixed(0)}/month`,
    }));

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current subscription
// @route   GET /api/subscriptions/current
// @access  Private
exports.getCurrentSubscription = async (req, res, next) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user.id });

    // Create free subscription if none exists
    if (!subscription) {
      subscription = await Subscription.create({
        userId: req.user.id,
        plan: 'free',
        status: 'active',
      });
    }

    const planDetails = SUBSCRIPTION_PLANS[subscription.plan];

    res.status(200).json({
      success: true,
      subscription: {
        ...subscription.toObject(),
        planDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create subscription checkout
// @route   POST /api/subscriptions/checkout
// @access  Private
exports.createCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body;

    if (!['pro', 'enterprise'].includes(plan)) {
      return next(new ErrorResponse('Invalid plan selected', 400));
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    const user = await User.findById(req.user.id);

    // Create or get Razorpay customer
    let razorpayCustomerId;
    const existingSubscription = await Subscription.findOne({ userId: req.user.id });

    if (existingSubscription?.razorpayCustomerId) {
      razorpayCustomerId = existingSubscription.razorpayCustomerId;
    } else {
      const customer = await razorpayInstance.customers.create({
        name: user.name,
        email: user.email,
        fail_existing: 0,
      });
      razorpayCustomerId = customer.id;
    }

    // Create Razorpay subscription
    const subscription = await razorpayInstance.subscriptions.create({
      plan_id: planConfig.razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 12, // 12 months
      notes: {
        userId: req.user.id.toString(),
        plan: plan,
      },
    });

    // Save subscription details
    await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      {
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: planConfig.razorpayPlanId,
        razorpayCustomerId: razorpayCustomerId,
        plan: plan,
        status: 'active',
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay checkout error:', error);
    next(new ErrorResponse('Failed to create subscription', 500));
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user.id });

    if (!subscription || subscription.plan === 'free') {
      return next(new ErrorResponse('No active subscription found', 404));
    }

    // Cancel in Razorpay
    if (subscription.razorpaySubscriptionId) {
      await razorpayInstance.subscriptions.cancel(subscription.razorpaySubscriptionId);
    }

    // Update subscription to free
    subscription.plan = 'free';
    subscription.status = 'cancelled';
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    // Update user
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionTier: 'free',
      subscriptionStatus: 'cancelled',
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  createCheckout,
  cancelSubscription,
};