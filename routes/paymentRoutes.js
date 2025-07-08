const express = require("express");
const {
  getPaymentsByEmployee,
  getPaymentsByEmployeePaginated,
} = require("../controllers/paymentController");
const { requireEmployeeRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all payments for an employee
router.get("/:employeeEmail", requireEmployeeRole, getPaymentsByEmployee);

// Get paginated payments for an employee
router.get(
  "/:employeeEmail/paginated",
  requireEmployeeRole,
  getPaymentsByEmployeePaginated
);

module.exports = router;
