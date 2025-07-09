const express = require("express");
const {
  createPayrollRequest,
  getPendingPayrollRequests,
  approvePayrollRequest,
} = require("../controllers/payrollController");

const router = express.Router();

// HR: Create payroll approval request
router.post("/request", createPayrollRequest);

// Admin: Get all pending payroll requests
router.get("/pending", getPendingPayrollRequests);

// Admin: Approve or reject payroll request
router.put("/:id/approve", approvePayrollRequest);

module.exports = router;