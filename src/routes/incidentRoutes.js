const express = require("express");
const { getAllIncidents } = require("../controllers/checkController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes are protected
router.use(protect);

// Get all incidents for authenticated user
router.get("/", getAllIncidents);

module.exports = router;
