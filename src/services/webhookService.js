const axios = require("axios");
const AlertLog = require("../models/AlertLog");

/**
 * Send webhook notification
 * @param {Object} check - Check document
 * @param {Object} incident - Incident document
 * @param {String} eventType - 'down' or 'recovery'
 * @returns {Promise}
 */
const sendWebhook = async (check, incident, eventType) => {
  if (!check.webhookUrl || !check.webhookEnabled) {
    return { skipped: true, reason: "Webhook not configured or disabled" };
  }

  const startTime = Date.now();
  let alertLog;

  try {
    // Prepare webhook payload
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      check: {
        id: check._id,
        name: check.name,
        url: check.url,
        status: check.status,
        uptime: check.uptime,
      },
      incident: {
        id: incident._id,
        status: incident.status,
        startedAt: incident.startedAt,
        resolvedAt: incident.resolvedAt,
        duration: incident.duration,
        failureReason: incident.failureReason,
        errorType: incident.errorType,
      },
    };

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "UptimeMonitor-Webhook/1.0",
      ...Object.fromEntries(check.webhookHeaders || new Map()),
    };

    // Send webhook
    const response = await axios.post(check.webhookUrl, payload, {
      headers,
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const responseTime = Date.now() - startTime;

    // Log successful webhook
    alertLog = await AlertLog.create({
      incidentId: incident._id,
      checkId: check._id,
      userId: check.userId,
      type: "webhook",
      channel: eventType,
      sentAt: new Date(),
      success: true,
      recipient: check.webhookUrl,
      responseTime,
      statusCode: response.status,
    });

    console.log(
      `   🪝 Webhook sent successfully (${responseTime}ms) - Status: ${response.status}`,
    );

    return {
      success: true,
      statusCode: response.status,
      responseTime,
      logId: alertLog._id,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;

    // Log failed webhook
    alertLog = await AlertLog.create({
      incidentId: incident._id,
      checkId: check._id,
      userId: check.userId,
      type: "webhook",
      channel: eventType,
      sentAt: new Date(),
      success: false,
      recipient: check.webhookUrl,
      errorMessage,
      responseTime,
      statusCode,
    });

    console.error(`   ❌ Webhook failed (${responseTime}ms):`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      statusCode,
      responseTime,
      logId: alertLog._id,
    };
  }
};

module.exports = {
  sendWebhook,
};
