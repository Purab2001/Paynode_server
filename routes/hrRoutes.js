const express = require("express");
const { getHRDashboardStats } = require("../controllers/hrController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { requireHRRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/dashboard-stats", verifyFirebaseToken, requireHRRole, getHRDashboardStats);

module.exports = router;