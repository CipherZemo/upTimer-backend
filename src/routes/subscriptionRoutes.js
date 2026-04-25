const express = require('express');
const {
  getPlans,
  getCurrentSubscription,
  createCheckout,
  cancelSubscription,
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/plans', getPlans);

// Protected routes
router.use(protect);

router.get('/current', getCurrentSubscription);
router.post('/checkout', createCheckout);
router.post('/cancel', cancelSubscription);

module.exports = router;