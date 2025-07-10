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

// List all verified employees (including HRs)
router.get("/employees", getAllVerifiedEmployees);

// Fire an employee or HR
// Rehire a fired employee or HR
router.put("/employees/:email/rehire", require("../controllers/adminController").rehireEmployee);
router.put("/employees/:email/fire", fireEmployee);

// Promote employee to HR
router.put("/employees/:email/promote", promoteToHR);
// Demote HR to Employee
router.put("/employees/:email/demote", require("../controllers/adminController").demoteToEmployee);

// Adjust salary for employee/HR
router.put("/employees/:email/salary", adjustSalary);

// List payroll requests
router.get("/payroll/requests", getPayrollRequests);

const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { requireAdminRole } = require("../middleware/roleMiddleware");

// Approve payroll payment
router.put("/payroll/:id/approve", verifyFirebaseToken, requireAdminRole, approvePayrollPayment);

module.exports = router;
