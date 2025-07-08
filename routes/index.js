const express = require("express");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const worksheetRoutes = require("./worksheetRoutes");
const paymentRoutes = require("./paymentRoutes");

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

module.exports = router;
