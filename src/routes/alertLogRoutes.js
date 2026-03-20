const express = require("express");
const { getAllAlertLogs } = require("../controllers/alertLogController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getAllAlertLogs);

module.exports = router;
