// Employee-specific API routes for dashboard and overview
const express = require("express");
const router = express.Router();
const { getEmployeeStats, getEmployeeRecentActivity, getEmployeeWorkSummary, getEmployeeRecentWork } = require("../controllers/employeeController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");

// All routes require authentication
router.get("/stats/:email", verifyFirebaseToken, getEmployeeStats);
router.get("/recent-activity/:email", verifyFirebaseToken, getEmployeeRecentActivity);
router.get("/work-summary/:email", verifyFirebaseToken, getEmployeeWorkSummary);
router.get("/recent-work/:email", verifyFirebaseToken, getEmployeeRecentWork);

module.exports = router;