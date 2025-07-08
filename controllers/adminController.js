const { getDB } = require("../config/database");
const {
  createFirebaseUser,
  getFirebaseUserByEmail,
} = require("../services/firebaseService");

const createAdminUser = async (req, res) => {
  try {
    const usersCollection = getDB().collection("users");

    // Check if admin already exists in MongoDB
    const existingAdmin = await usersCollection.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin user already exists in MongoDB",
      });
    }

    // Check if admin already exists in Firebase
    const existingFirebaseUser = await getFirebaseUserByEmail(
      process.env.ADMIN_EMAIL
    );
    if (existingFirebaseUser) {
      return res.status(400).json({
        success: false,
        message: "Admin user already exists in Firebase",
      });
    }

    // Create user in Firebase Auth first
    const firebaseUser = await createFirebaseUser(
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_PASSWORD,
      process.env.ADMIN_NAME || "PayNode Admin"
    );

    try {
      // Create user in MongoDB
      const adminUser = {
        name: process.env.ADMIN_NAME || "PayNode Admin",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
        bank_account_no: "",
        salary: 0,
        designation: "Admin",
        photo: "",
        provider: "local",
        firebaseUid: firebaseUser.uid,
        createdAt: new Date(),
      };

      const result = await usersCollection.insertOne(adminUser);

      res.status(201).json({
        success: true,
        message: "Admin user created successfully in both Firebase and MongoDB",
        userId: result.insertedId,
        firebaseUid: firebaseUser.uid,
      });
    } catch (mongoError) {
      // If MongoDB insertion failed, cleanup Firebase user
      try {
        const { admin } = require("../config/firebase");
        await admin.auth().deleteUser(firebaseUser.uid);
      } catch (cleanupError) {
        console.error("Failed to cleanup Firebase user:", cleanupError);
      }
      throw mongoError;
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({
      success: false,
      message: "Error creating admin user",
      error: error.message,
    });
  }
};

module.exports = {
  createAdminUser,
};
