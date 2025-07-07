const express = require("express");
const { createAdminUser } = require("../controllers/adminController");

const router = express.Router();

// Create admin user route (backend only)
router.post("/create-admin", createAdminUser);

module.exports = router;
