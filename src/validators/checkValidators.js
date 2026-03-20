const { body, query, validationResult } = require("express-validator");

// Validation rules for creating a check
const createCheckValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("url")
    .trim()
    .notEmpty()
    .withMessage("URL is required")
    .isURL({ protocols: ["http", "https"], require_protocol: false })
    .withMessage("Please provide a valid URL"),

  body("protocol")
    .optional()
    .isIn(["http", "https"])
    .withMessage("Protocol must be http or https"),

  body("method")
    .optional()
    .isIn(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .withMessage("Method must be GET, POST, PUT, DELETE, or PATCH"),

  body("interval")
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage("Interval must be a number between 1 and 60")
    .custom((value) => {
      const validIntervals = [1, 5, 15, 30, 60];
      if (!validIntervals.includes(parseInt(value))) {
        throw new Error("Interval must be 1, 5, 15, 30, or 60 minutes");
      }
      return true;
    }),

  body("timeout")
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage("Timeout must be between 5 and 60 seconds"),

  body("expectedStatusCode")
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage("Expected status code must be between 100 and 599"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),

  body("webhookUrl")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Webhook URL must be a valid HTTP/HTTPS URL"),

  body("webhookEnabled")
    .optional()
    .isBoolean()
    .withMessage("webhookEnabled must be a boolean"),
];

// Validation rules for updating a check
const updateCheckValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("url")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("URL cannot be empty")
    .isURL({ protocols: ["http", "https"], require_protocol: false })
    .withMessage("Please provide a valid URL"),

  body("protocol")
    .optional()
    .isIn(["http", "https"])
    .withMessage("Protocol must be http or https"),

  body("method")
    .optional()
    .isIn(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .withMessage("Method must be GET, POST, PUT, DELETE, or PATCH"),

  body("interval")
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage("Interval must be a number between 1 and 60")
    .custom((value) => {
      const validIntervals = [1, 5, 15, 30, 60];
      if (!validIntervals.includes(parseInt(value))) {
        throw new Error("Interval must be 1, 5, 15, 30, or 60 minutes");
      }
      return true;
    }),

  body("timeout")
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage("Timeout must be between 5 and 60 seconds"),

  body("expectedStatusCode")
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage("Expected status code must be between 100 and 599"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("tags").optional().isArray().withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),

  body("webhookUrl")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Webhook URL must be a valid HTTP/HTTPS URL"),

  body("webhookEnabled")
    .optional()
    .isBoolean()
    .withMessage("webhookEnabled must be a boolean"),
];

// Validation rules for query parameters
const queryValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isIn(["up", "down", "paused"])
    .withMessage("Status must be up, down, or paused"),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),

  query("sortBy")
    .optional()
    .isIn([
      "name",
      "createdAt",
      "updatedAt",
      "lastCheckedAt",
      "status",
      "uptime",
    ])
    .withMessage("Invalid sortBy field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

module.exports = {
  createCheckValidation,
  updateCheckValidation,
  queryValidation,
  validate,
};
