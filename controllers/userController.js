const { getDB } = require("../config/database");

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const usersCollection = getDB().collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      email: userData.email,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create new user
    const result = await usersCollection.insertOne(userData);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

const getUserByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const usersCollection = getDB().collection("users");
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUserByEmail,
};
