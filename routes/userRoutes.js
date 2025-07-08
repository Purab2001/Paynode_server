const express = require("express");
const {
  createUser,
  getUserByEmail,
  getUserRole,
} = require("../controllers/userController");

const router = express.Router();

// User registration route
router.post("/users", createUser);

// Get user by email
router.get("/users/:email", getUserByEmail);

// Get user role by email
router.get("/users/:email/role", getUserRole);

module.exports = router;
