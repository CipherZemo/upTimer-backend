const Check = require("../../models/Check");
const CheckResult = require("../../models/CheckResult");
const Incident = require("../../models/Incident");
const User = require("../../models/User");
const { performHealthCheck } = require("../services/httpClient");
const { calculateUptime } = require("../services/uptimeCalculator");
const {
  sendDownAlerts,
  sendRecoveryAlerts,
} = require("../../services/alertManager");

/**
 * Create a new incident when check goes down
 */
const createIncident = async (check, result, user) => {
  try {
    const incident = await Incident.create({
      checkId: check._id,
      userId: check.userId,
      status: "open",
      startedAt: new Date(),
      failureReason: result.errorMessage,
      errorType: result.errorType,
      downAlertSent: false,
      recoveryAlertSent: false,
    });

    console.log(`   🚨 Incident created: ${incident._id}`);

    // Send alerts (email + webhook) via Alert Manager
    const alertResults = await sendDownAlerts(user, check, incident);

    // Update incident with alert status
    incident.downAlertSent =
      alertResults.email.sent || alertResults.webhook.sent;
    await incident.save();

    return incident;
  } catch (error) {
    console.error(`   ❌ Error creating incident:`, error.message);
    return null;
  }
};

/**
 * Resolve an open incident when check recovers
 */
const resolveIncident = async (check, user) => {
  try {
    // Find the most recent open incident for this check
    const incident = await Incident.findOne({
      checkId: check._id,
      status: "open",
    }).sort({ startedAt: -1 });

    if (!incident) {
      console.log(`   ℹ️  No open incident found to resolve`);
      return null;
    }

    // Resolve the incident
    await incident.resolve();

    console.log(
      `   ✅ Incident resolved: ${incident._id} (Duration: ${incident.duration} min)`,
    );

    // Send alerts (email + webhook) via Alert Manager
    const alertResults = await sendRecoveryAlerts(user, check, incident);

    // Update incident with alert status
    incident.recoveryAlertSent =
      alertResults.email.sent || alertResults.webhook.sent;
    await incident.save();

    return incident;
  } catch (error) {
    console.error(`   ❌ Error resolving incident:`, error.message);
    return null;
  }
};

/**
 * Process a health check job
 * @param {Object} job - BullMQ job
 */
const processCheck = async (job) => {
  const { checkId } = job.data;

  console.log(`\n🔍 Processing check ID: ${checkId}`);

  try {
    // Get check from database
    const check = await Check.findById(checkId);

    if (!check) {
      console.error(`❌ Check not found: ${checkId}`);
      return { success: false, error: "Check not found" };
    }

    // Skip if check is not active
    if (!check.isActive) {
      console.log(`⏸️  Check paused, skipping: ${check.name}`);
      return { success: true, skipped: true };
    }

    // Get user for alert preferences
    const user = await User.findById(check.userId);
    if (!user) {
      console.error(`❌ User not found: ${check.userId}`);
      return { success: false, error: "User not found" };
    }

    console.log(`📡 Checking: ${check.name} (${check.url})`);

    // Perform health check (with retry logic)
    const result = await performHealthCheck(check);

    console.log(
      `📊 Result: ${result.status} | ${result.responseTime}ms | Status: ${result.statusCode || "N/A"} | Attempts: ${result.attempts}`,
    );

    // Save check result
    const checkResult = await CheckResult.create({
      checkId: check._id,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
      errorType: result.errorType,
      timestamp: new Date(),
      checkedAt: new Date(),
      responseHeaders: result.responseHeaders,
      responseSize: result.responseSize,
    });

    // Determine new status
    const previousStatus = check.status;
    const newStatus = result.status === "success" ? "up" : "down";

    // Calculate uptime (last 24 hours)
    const uptime = await calculateUptime(check._id, 24);

    // Update check document
    await Check.findByIdAndUpdate(check._id, {
      status: newStatus,
      lastCheckedAt: new Date(),
      uptime: uptime,
    });

    // Handle status changes and incidents
    if (previousStatus !== newStatus) {
      console.log(
        `🚨 Status changed: ${check.name} is now ${newStatus.toUpperCase()}`,
      );

      if (newStatus === "down") {
        // Check went down - create incident and send alerts
        await createIncident(check, result, user);
      } else if (newStatus === "up") {
        // Check recovered - resolve incident and send alerts
        await resolveIncident(check, user);
      }
    }

    console.log(`✅ Check complete: ${check.name} | Uptime: ${uptime}%`);

    return {
      success: true,
      checkId,
      checkName: check.name,
      status: newStatus,
      responseTime: result.responseTime,
      uptime,
      attempts: result.attempts,
    };
  } catch (error) {
    console.error(`❌ Error processing check ${checkId}:`, error.message);

    // Save failed result
    try {
      await CheckResult.create({
        checkId,
        status: "failure",
        responseTime: 0,
        errorMessage: error.message,
        errorType: "unknown",
        timestamp: new Date(),
        checkedAt: new Date(),
      });
    } catch (saveError) {
      console.error("❌ Error saving failed result:", saveError.message);
    }

    throw error; // Let BullMQ handle retry
  }
};

module.exports = {
  processCheck,
};
