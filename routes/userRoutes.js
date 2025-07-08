const express = require("express");
const {
  createUser,
  getUserByEmail,
  getUserRole,
} = require("../controllers/userController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");

const router = express.Router();

// User registration route
router.post("/users", createUser);

// Get user by email
router.get("/users/:email", getUserByEmail);

// Get user role by email (protected route)
router.get("/users/:email/role", verifyFirebaseToken, getUserRole);

module.exports = router;
