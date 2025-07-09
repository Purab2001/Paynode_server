const express = require("express");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const worksheetRoutes = require("./worksheetRoutes");
const paymentRoutes = require("./paymentRoutes");
const employeeRoutes = require("./employeeRoutes");
const payrollRoutes = require("./payrollRoutes");
const hrRoutes = require("./hrRoutes");

const router = express.Router();

// Health check route
router.get("/", (req, res) => {
  res.send("PayNode Server is running");
});

// Mount route modules
router.use("/", adminRoutes);
router.use("/", userRoutes);
router.use("/api/worksheets", worksheetRoutes);
router.use("/api/payments", paymentRoutes);
router.use("/api/employee", employeeRoutes);
router.use("/api/payroll", payrollRoutes);
router.use("/api/hr", hrRoutes);

module.exports = router;
