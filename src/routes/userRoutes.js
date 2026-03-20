const express = require("express");
const {
  getAlertPreferences,
  updateAlertPreferences,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes are protected
router.use(protect);

router
  .route("/preferences")
  .get(getAlertPreferences)
  .put(updateAlertPreferences);

module.exports = router;
