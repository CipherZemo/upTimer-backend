const express = require("express");
const {
  createCheck,
  getChecks,
  getCheck,
  updateCheck,
  deleteCheck,
  getCheckStats,
  getCheckResults,
  getCheckIncidents,
} = require("../controllers/checkController");
const { protect } = require("../middleware/authMiddleware");
const { getCheckAlertLogs } = require("../controllers/alertLogController");
const {
  createCheckValidation,
  updateCheckValidation,
  queryValidation,
  validate,
} = require("../validators/checkValidators");

const router = express.Router();

router.use(protect); // All routes are protected (require authentication)
router.get("/stats", getCheckStats); // Stats route must be defined before /:id to avoid conflict

// CRUD routes
router
  .route("/")
  .get(queryValidation, validate, getChecks)
  .post(createCheckValidation, validate, createCheck);

router.get("/:id/results", getCheckResults);
router.get("/:id/incidents", getCheckIncidents);
router.get("/:id/alerts", getCheckAlertLogs);
router
  .route("/:id")
  .get(getCheck)
  .put(updateCheckValidation, validate, updateCheck)
  .delete(deleteCheck);

module.exports = router;
