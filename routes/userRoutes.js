const express = require("express");
const { createUser, getUserByEmail } = require("../controllers/userController");

const router = express.Router();

// User registration route
router.post("/users", createUser);

// Get user by email
router.get("/users/:email", getUserByEmail);

module.exports = router;
