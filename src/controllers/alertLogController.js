const AlertLog = require("../models/AlertLog");
const Check = require("../models/Check");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get alert logs for a check
// @route   GET /api/checks/:id/alerts
// @access  Private
exports.getCheckAlertLogs = async (req, res, next) => {
  try {
    const check = await Check.findById(req.params.id);

    if (!check) {
      return next(new ErrorResponse("Check not found", 404));
    }

    // Object-level authorization
    if (check.userId.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to access this check", 403),
      );
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Filter
    const filter = { checkId: req.params.id };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.channel) {
      filter.channel = req.query.channel;
    }
    if (req.query.success !== undefined) {
      filter.success = req.query.success === "true";
    }

    // Get alert logs
    const logs = await AlertLog.find(filter)
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AlertLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all alert logs for user
// @route   GET /api/alerts
// @access  Private
exports.getAllAlertLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Filter
    const filter = { userId };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.channel) {
      filter.channel = req.query.channel;
    }
    if (req.query.success !== undefined) {
      filter.success = req.query.success === "true";
    }

    // Get alert logs with check details
    const logs = await AlertLog.find(filter)
      .populate("checkId", "name url")
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AlertLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCheckAlertLogs,
  getAllAlertLogs,
};
