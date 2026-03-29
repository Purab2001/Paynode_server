const express = require("express");
const {
  createAdminUser,
  getAllVerifiedEmployees,
  fireEmployee,
  promoteToHR,
  adjustSalary,
  getPayrollRequests,
  approvePayrollPayment,
} = require("../controllers/adminController");

const router = express.Router();

/**
 * Admin routes for employee and payroll management
 */

// Create admin user route (backend only)
router.post("/create-admin", createAdminUser);

// Sync custom claims for existing users
router.post("/sync-claims", async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ success: false, message: "Email and role required" });
    }
    
    const usersCol = require("../config/database").getDB().collection("users");
    const user = await usersCol.findOne({ email });
    
    const uid = user?.firebaseUid || user?.uid;
    if (!user || !uid) {
      return res.status(404).json({ success: false, message: "User not found or no uid" });
    }
    
    const { admin } = require("../config/firebase");
    await admin.auth().setCustomUserClaims(uid, { role });
    
    res.json({ success: true, message: `Claims updated for ${email} to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List all verified employees (including HRs)
router.get("/employees", getAllVerifiedEmployees);

// Fire an employee or HR
// Rehire a fired employee or HR
router.put(
  "/employees/:email/rehire",
  require("../controllers/adminController").rehireEmployee
);
router.put("/employees/:email/fire", fireEmployee);

// Promote employee to HR
router.put("/employees/:email/promote", promoteToHR);
// Demote HR to Employee
router.put(
  "/employees/:email/demote",
  require("../controllers/adminController").demoteToEmployee
);

// Adjust salary for employee/HR
router.put("/employees/:email/salary", adjustSalary);

// List payroll requests
router.get("/payroll/requests", getPayrollRequests);

const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { requireAdminRole } = require("../middleware/roleMiddleware");

// Approve payroll payment
router.put(
  "/payroll/:id/approve",
  verifyFirebaseToken,
  requireAdminRole,
  approvePayrollPayment
);

// Admin dashboard stats
router.get(
  "/dashboard-stats",
  require("../controllers/adminController").getAdminDashboardStats
);

module.exports = router;
