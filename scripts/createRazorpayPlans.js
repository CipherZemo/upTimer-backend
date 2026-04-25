require('dotenv').config();
const { razorpayInstance, SUBSCRIPTION_PLANS } = require('../src/config/razorpay');

async function createPlans() {
  try {
    console.log('Creating Razorpay subscription plans...\n');

    // Create Pro Plan
    const proPlan = await razorpayInstance.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: SUBSCRIPTION_PLANS.pro.name,
        amount: SUBSCRIPTION_PLANS.pro.price,
        currency: SUBSCRIPTION_PLANS.pro.currency,
        description: 'Pro plan - 50 checks, 1 min interval',
      },
    });
    console.log('✅ Pro Plan Created:');
    console.log(`   ID: ${proPlan.id}`);
    console.log(`   Add to .env: RAZORPAY_PRO_PLAN_ID=${proPlan.id}\n`);

    // Create Enterprise Plan
    const enterprisePlan = await razorpayInstance.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: SUBSCRIPTION_PLANS.enterprise.name,
        amount: SUBSCRIPTION_PLANS.enterprise.price,
        currency: SUBSCRIPTION_PLANS.enterprise.currency,
        description: 'Enterprise plan - Unlimited checks, priority support',
      },
    });
    console.log('✅ Enterprise Plan Created:');
    console.log(`   ID: ${enterprisePlan.id}`);
    console.log(`   Add to .env: RAZORPAY_ENTERPRISE_PLAN_ID=${enterprisePlan.id}\n`);

    console.log('🎉 All plans created successfully!');
    console.log('\n📝 Add these to your .env file:');
    console.log(`RAZORPAY_PRO_PLAN_ID=${proPlan.id}`);
    console.log(`RAZORPAY_ENTERPRISE_PLAN_ID=${enterprisePlan.id}`);
  } catch (error) {
    console.error('❌ Error creating plans:', error);
  }
}

createPlans();