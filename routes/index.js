const express = require("express");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

// Health check route
router.get("/", (req, res) => {
  res.send("PayNode Server is running");
});

// Mount route modules
router.use("/", adminRoutes);
router.use("/", userRoutes);

module.exports = router;
