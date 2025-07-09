const express = require("express");
const {
  getPaymentsByEmployee,
  getPaymentsByEmployeePaginated,
} = require("../controllers/paymentController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { requireEmployeeRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all payments for an employee
router.get("/:employeeEmail", verifyFirebaseToken, requireEmployeeRole, getPaymentsByEmployee);

// Get paginated payments for an employee
router.get(
  "/:employeeEmail/paginated",
  verifyFirebaseToken,
  requireEmployeeRole,
  getPaymentsByEmployeePaginated
);

module.exports = router;
