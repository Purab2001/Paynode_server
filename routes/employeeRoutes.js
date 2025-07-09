// Employee-specific API routes for dashboard and overview
const express = require("express");
const router = express.Router();
const {
  getEmployeeStats,
  getEmployeeRecentActivity,
  getEmployeeWorkSummary,
  getEmployeeRecentWork,
  getAllEmployees,
  toggleEmployeeVerification,
  getEmployeeBySlug,
} = require("../controllers/employeeController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");

// All routes require authentication
router.get("/stats/:email", verifyFirebaseToken, getEmployeeStats);
router.get(
  "/recent-activity/:email",
  verifyFirebaseToken,
  getEmployeeRecentActivity
);
router.get("/work-summary/:email", verifyFirebaseToken, getEmployeeWorkSummary);
router.get("/recent-work/:email", verifyFirebaseToken, getEmployeeRecentWork);

// HR/Admin: Get all employees
router.get("/all", verifyFirebaseToken, getAllEmployees);

// HR/Admin: Toggle verification
router.put("/:email/verify", verifyFirebaseToken, toggleEmployeeVerification);

// HR/Admin: Get employee by slug (email or uid)
router.get("/:slug", verifyFirebaseToken, getEmployeeBySlug);

module.exports = router;
