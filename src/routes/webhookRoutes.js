const express = require('express');
const { handleRazorpayWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Razorpay webhook (raw body needed for signature verification)
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

module.exports = router;