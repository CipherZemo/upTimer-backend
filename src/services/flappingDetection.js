const Incident = require("../models/Incident");

/**
 * Check if a check is flapping (rapidly changing state)
 * @param {String} checkId - Check ID
 * @param {Number} minutes - Time window to check (default: 15 minutes)
 * @param {Number} threshold - Number of incidents to consider flapping (default: 3)
 * @returns {Promise<Boolean>}
 */
const isFlapping = async (checkId, minutes = 15, threshold = 3) => {
  try {
    const sinceTime = new Date(Date.now() - minutes * 60 * 1000);

    // Count incidents created in the last X minutes
    const recentIncidents = await Incident.countDocuments({
      checkId,
      startedAt: { $gte: sinceTime },
    });

    const isFlappingDetected = recentIncidents >= threshold;

    if (isFlappingDetected) {
      console.log(
        `   ⚠️  Flapping detected: ${recentIncidents} incidents in ${minutes} minutes`,
      );
    }

    return isFlappingDetected;
  } catch (error) {
    console.error("Error detecting flapping:", error.message);
    return false; // Default to not flapping on error
  }
};

/**
 * Check if incident was too short to alert on recovery
 * @param {Object} incident - Incident document
 * @param {Number} minDurationMinutes - Minimum duration to send recovery alert (default: 2)
 * @returns {Boolean}
 */
const isTooShortToAlert = (incident, minDurationMinutes = 2) => {
  if (!incident.duration) {
    return false;
  }

  const tooShort = incident.duration < minDurationMinutes;

  if (tooShort) {
    console.log(
      `   ℹ️  Incident too short (${incident.duration} min), skipping recovery alert`,
    );
  }

  return tooShort;
};

module.exports = {
  isFlapping,
  isTooShortToAlert,
};
