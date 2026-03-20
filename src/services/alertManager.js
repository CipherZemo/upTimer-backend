const AlertLog = require("../models/AlertLog");
const { sendDownAlert, sendRecoveryAlert } = require("./emailService");
const { sendWebhook } = require("./webhookService");
const { isFlapping, isTooShortToAlert } = require("./flappingDetection");

/**
 * Check if we're in quiet hours
 * @param {Object} user - User document with alertPreferences
 * @returns {Boolean}
 */
const isQuietHours = (user) => {
  if (!user.alertPreferences?.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const preferences = user.alertPreferences;

  // Get current time in user's timezone (simplified - using UTC for now)
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Parse quiet hours
  const [startHour, startMinute] = preferences.quietHoursStart
    .split(":")
    .map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(":").map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  // Normal quiet hours (e.g., 08:00 - 17:00)
  return currentTime >= startTime && currentTime < endTime;
};

/**
 * Send down alert (email + webhook)
 * @param {Object} user - User document
 * @param {Object} check - Check document
 * @param {Object} incident - Incident document
 */
const sendDownAlerts = async (user, check, incident) => {
  const results = {
    email: { sent: false },
    webhook: { sent: false },
  };

  try {
    // Check for flapping
    const flapping = await isFlapping(check._id);
    if (flapping) {
      console.log(`   🚫 Alerts suppressed due to flapping`);
      return results;
    }

    // Check quiet hours
    if (isQuietHours(user)) {
      console.log(`   🔕 Alerts suppressed - quiet hours active`);
      return results;
    }

    // Send email alert
    if (user.alertPreferences?.emailOnDown !== false) {
      try {
        const emailResult = await sendDownAlert(user, check, incident);
        results.email.sent = emailResult.success || false;

        // Log email alert
        await AlertLog.create({
          incidentId: incident._id,
          checkId: check._id,
          userId: user._id,
          type: "email",
          channel: "down",
          sentAt: new Date(),
          success: results.email.sent,
          recipient: user.email,
          errorMessage: emailResult.error || null,
        });

        if (results.email.sent) {
          console.log(`   📧 Down alert email sent to ${user.email}`);
        }
      } catch (error) {
        console.error(`   ❌ Error sending down alert email:`, error.message);
      }
    } else {
      console.log(`   ℹ️  Email alerts disabled by user preference`);
    }

    // Send webhook alert
    if (
      user.alertPreferences?.webhookOnDown !== false &&
      check.webhookEnabled
    ) {
      try {
        const webhookResult = await sendWebhook(check, incident, "down");
        results.webhook.sent = webhookResult.success || false;

        if (results.webhook.sent) {
          console.log(`   🪝 Down alert webhook sent`);
        }
      } catch (error) {
        console.error(`   ❌ Error sending down alert webhook:`, error.message);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error in sendDownAlerts:`, error.message);
  }

  return results;
};

/**
 * Send recovery alert (email + webhook)
 * @param {Object} user - User document
 * @param {Object} check - Check document
 * @param {Object} incident - Incident document
 */
const sendRecoveryAlerts = async (user, check, incident) => {
  const results = {
    email: { sent: false },
    webhook: { sent: false },
  };

  try {
    // Check if incident was too short
    if (isTooShortToAlert(incident)) {
      console.log(`   🚫 Recovery alerts suppressed - incident too short`);
      return results;
    }

    // Check quiet hours
    if (isQuietHours(user)) {
      console.log(`   🔕 Alerts suppressed - quiet hours active`);
      return results;
    }

    // Send email alert
    if (user.alertPreferences?.emailOnRecovery !== false) {
      try {
        const emailResult = await sendRecoveryAlert(user, check, incident);
        results.email.sent = emailResult.success || false;

        // Log email alert
        await AlertLog.create({
          incidentId: incident._id,
          checkId: check._id,
          userId: user._id,
          type: "email",
          channel: "recovery",
          sentAt: new Date(),
          success: results.email.sent,
          recipient: user.email,
          errorMessage: emailResult.error || null,
        });

        if (results.email.sent) {
          console.log(`   📧 Recovery alert email sent to ${user.email}`);
        }
      } catch (error) {
        console.error(
          `   ❌ Error sending recovery alert email:`,
          error.message,
        );
      }
    } else {
      console.log(`   ℹ️  Email alerts disabled by user preference`);
    }

    // Send webhook alert
    if (
      user.alertPreferences?.webhookOnRecovery !== false &&
      check.webhookEnabled
    ) {
      try {
        const webhookResult = await sendWebhook(check, incident, "recovery");
        results.webhook.sent = webhookResult.success || false;

        if (results.webhook.sent) {
          console.log(`   🪝 Recovery alert webhook sent`);
        }
      } catch (error) {
        console.error(
          `   ❌ Error sending recovery alert webhook:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(`   ❌ Error in sendRecoveryAlerts:`, error.message);
  }

  return results;
};

module.exports = {
  sendDownAlerts,
  sendRecoveryAlerts,
  isQuietHours,
};
