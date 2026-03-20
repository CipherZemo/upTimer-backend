const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get user alert preferences
// @route   GET /api/users/preferences
// @access  Private
exports.getAlertPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("alertPreferences");

    res.status(200).json({
      success: true,
      preferences: user.alertPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user alert preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updateAlertPreferences = async (req, res, next) => {
  try {
    const allowedFields = [
      "emailOnDown",
      "emailOnRecovery",
      "emailOnSlow",
      "webhookOnDown",
      "webhookOnRecovery",
      "quietHoursEnabled",
      "quietHoursStart",
      "quietHoursEnd",
      "timezone",
    ];

    // Build update object
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[`alertPreferences.${field}`] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("alertPreferences");

    res.status(200).json({
      success: true,
      preferences: user.alertPreferences,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlertPreferences,
  updateAlertPreferences,
};
