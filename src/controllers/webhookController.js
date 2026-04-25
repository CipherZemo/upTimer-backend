const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// @desc    Handle Razorpay webhooks
// @route   POST /api/webhooks/razorpay
// @access  Public (but verified)
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`📨 Webhook received: ${event}`);

    switch (event) {
      case 'subscription.charged':
        await handleSubscriptionCharged(payload);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(payload);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(payload);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(payload);
        break;

      case 'subscription.pending':
        await handleSubscriptionPending(payload);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(payload);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle subscription charged (payment successful)
async function handleSubscriptionCharged(payload) {
  const subscriptionEntity = payload.subscription.entity;
  const paymentEntity = payload.payment.entity;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionEntity.id,
  });

  if (!subscription) {
    console.error('Subscription not found:', subscriptionEntity.id);
    return;
  }

  // Update subscription
  subscription.lastPaymentDate = new Date();
  subscription.lastPaymentAmount = paymentEntity.amount;
  subscription.lastPaymentStatus = 'succeeded';
  subscription.currentPeriodStart = new Date(subscriptionEntity.current_start * 1000);
  subscription.currentPeriodEnd = new Date(subscriptionEntity.current_end * 1000);
  subscription.status = 'active';
  await subscription.save();

  // Update user
  await User.findByIdAndUpdate(subscription.userId, {
    subscriptionStatus: 'active',
  });

  console.log(`✅ Payment successful for subscription: ${subscriptionEntity.id}`);
}

// Handle subscription activated
async function handleSubscriptionActivated(payload) {
  const subscriptionEntity = payload.subscription.entity;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionEntity.id,
  });

  if (!subscription) {
    console.error('Subscription not found:', subscriptionEntity.id);
    return;
  }

  const plan = subscriptionEntity.notes?.plan || 'pro';

  // Update subscription
  subscription.status = 'active';
  subscription.plan = plan;
  subscription.currentPeriodStart = new Date(subscriptionEntity.current_start * 1000);
  subscription.currentPeriodEnd = new Date(subscriptionEntity.current_end * 1000);
  await subscription.save();

  // Update user
  await User.findByIdAndUpdate(subscription.userId, {
    subscriptionTier: plan,
    subscriptionStatus: 'active',
  });

  console.log(`✅ Subscription activated: ${subscriptionEntity.id}`);
}

// Handle subscription cancelled
async function handleSubscriptionCancelled(payload) {
  const subscriptionEntity = payload.subscription.entity;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionEntity.id,
  });

  if (!subscription) return;

  subscription.status = 'cancelled';
  subscription.plan = 'free';
  await subscription.save();

  await User.findByIdAndUpdate(subscription.userId, {
    subscriptionTier: 'free',
    subscriptionStatus: 'cancelled',
  });

  console.log(`❌ Subscription cancelled: ${subscriptionEntity.id}`);
}

// Handle subscription paused
async function handleSubscriptionPaused(payload) {
  const subscriptionEntity = payload.subscription.entity;

  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscriptionEntity.id },
    { status: 'paused' }
  );

  console.log(`⏸️  Subscription paused: ${subscriptionEntity.id}`);
}

// Handle subscription resumed
async function handleSubscriptionResumed(payload) {
  const subscriptionEntity = payload.subscription.entity;

  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscriptionEntity.id },
    { status: 'active' }
  );

  console.log(`▶️  Subscription resumed: ${subscriptionEntity.id}`);
}

// Handle payment pending
async function handleSubscriptionPending(payload) {
  const subscriptionEntity = payload.subscription.entity;

  await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: subscriptionEntity.id },
    { lastPaymentStatus: 'pending' }
  );

  console.log(`⏳ Payment pending: ${subscriptionEntity.id}`);
}

// Handle subscription halted (payment failed)
async function handleSubscriptionHalted(payload) {
  const subscriptionEntity = payload.subscription.entity;

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: subscriptionEntity.id,
  });

  if (!subscription) return;

  subscription.status = 'expired';
  subscription.lastPaymentStatus = 'failed';
  await subscription.save();

  await User.findByIdAndUpdate(subscription.userId, {
    subscriptionStatus: 'expired',
  });

  console.log(`🛑 Subscription halted: ${subscriptionEntity.id}`);
}

module.exports = {
  handleRazorpayWebhook,
};