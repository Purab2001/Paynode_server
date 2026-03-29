const { connectDB } = require("../config/database");
const { getDB } = require("../config/database");
const {
  createFirebaseUser,
  getFirebaseUserByEmail,
  setCustomUserClaims,
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

    // Set custom claims for role
    await setCustomUserClaims(firebaseUser.uid, "admin");

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
  // List all verified employees (including HRs)
  getAllVerifiedEmployees: async (req, res) => {
    try {
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const employees = await usersCol
        .find({ role: { $in: ["Employee", "HR"] } })
        .toArray();
      res.json({ success: true, employees });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch verified employees",
        error: err.message,
      });
    }
  },
  // Fire an employee or HR (set fired status)
  fireEmployee: async (req, res) => {
    try {
      const { email } = req.params;
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const result = await usersCol.updateOne(
        { email },
        { $set: { fired: true } }
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({ success: true, message: "User fired successfully" });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to fire user",
        error: err.message,
      });
    }
  },
  // Rehire a fired employee or HR
  rehireEmployee: async (req, res) => {
    try {
      const { email } = req.params;
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const result = await usersCol.updateOne(
        { email, fired: true },
        { $set: { fired: false } }
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found or not fired" });
      }
      res.json({ success: true, message: "User rehired successfully" });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to rehire user",
        error: err.message,
      });
    }
  },
  // Promote employee to HR
  promoteToHR: async (req, res) => {
    try {
      const { email } = req.params;
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const user = await usersCol.findOne({ email, role: "Employee" });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found or already HR",
        });
      }
      await usersCol.updateOne(
        { email, role: "Employee" },
        { $set: { role: "HR" } }
      );
      if (user.firebaseUid) {
        await setCustomUserClaims(user.firebaseUid, "HR");
      }
      res.json({ success: true, message: "Employee promoted to HR" });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to promote employee to HR",
        error: err.message,
      });
    }
  },
  // Demote HR to Employee
  demoteToEmployee: async (req, res) => {
    try {
      const { email } = req.params;
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const user = await usersCol.findOne({ email, role: "HR" });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "HR not found or already Employee",
        });
      }
      await usersCol.updateOne(
        { email, role: "HR" },
        { $set: { role: "Employee" } }
      );
      if (user.firebaseUid) {
        await setCustomUserClaims(user.firebaseUid, "Employee");
      }
      res.json({ success: true, message: "HR demoted to Employee" });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to demote HR to Employee",
        error: err.message,
      });
    }
  },
  // Adjust salary for employee/HR
  adjustSalary: async (req, res) => {
    try {
      const { email } = req.params;
      const { salary } = req.body;
      if (typeof salary !== "number" || salary < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid salary value" });
      }
      const usersCol = require("../config/database")
        .getDB()
        .collection("users");
      const result = await usersCol.updateOne(
        { email, role: { $in: ["Employee", "HR"] } },
        { $set: { salary } }
      );
      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      res.json({ success: true, message: "Salary updated successfully" });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to update salary",
        error: err.message,
      });
    }
  },
  // List payroll requests
  getPayrollRequests: async (req, res) => {
    try {
      const payrollCol = require("../config/database")
        .getDB()
        .collection("payroll_approvals");
      let query = {};
      if (!req.query.all) {
        query.status = "pending";
      }
      const requests = await payrollCol
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.json({ success: true, requests });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch payroll requests",
        error: error.message,
      });
    }
  },
  // Approve payroll payment
  approvePayrollPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const { processedBy } = req.body;
      const payrollCol = require("../config/database")
        .getDB()
        .collection("payroll_approvals");
      let objectId;
      try {
        const { ObjectId } = require("mongodb");
        objectId = new ObjectId(id);
      } catch (e) {
        console.error("Payroll approval: invalid ObjectId", id, e);
        return res
          .status(400)
          .json({ success: false, message: "Invalid payroll request ID" });
      }
      const result = await payrollCol.updateOne(
        { _id: objectId, status: "pending" },
        { $set: { status: "approved", processedAt: new Date(), processedBy } },
        { bypassDocumentValidation: true }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Payroll request not found or already processed",
        });
      }

      // Insert payment record for employee payment history
      try {
        const payrollDoc = await payrollCol.findOne({ _id: objectId });
        if (payrollDoc) {
          const paymentsCol = require("../config/database")
            .getDB()
            .collection("payments");
          await paymentsCol.insertOne({
            employeeEmail: payrollDoc.employeeEmail,
            employeeName: payrollDoc.employeeName,
            amount: payrollDoc.salary,
            month: payrollDoc.month,
            year: payrollDoc.year,
            transactionId: req.body.transactionId || "", // Stripe PaymentIntent ID from frontend
            paidAt: new Date(),
            createdAt: new Date(),
          });
        }
      } catch (err) {
        console.error("Failed to insert payment record:", err);
        // Do not block payroll approval if payment record insertion fails
      }

      res.json({ success: true, message: "Payroll payment approved" });
    } catch (error) {
      console.error("Payroll approval error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve payroll payment",
        error: error.message,
      });
    }
  },
};

// Admin dashboard stats (total, verified, unverified employees, HR count)
module.exports.getAdminDashboardStats = async (req, res) => {
  try {
    const usersCol = require("../config/database").getDB().collection("users");
    // Count total employees and HRs (excluding fired)
    const totalEmployees = await usersCol.countDocuments({
      role: { $in: ["Employee", "HR"] },
      fired: { $ne: true },
    });
    // Count verified employees and HRs
    const verifiedEmployees = await usersCol.countDocuments({
      role: { $in: ["Employee", "HR"] },
      isVerified: true,
      fired: { $ne: true },
    });
    // Count unverified employees and HRs
    const unverifiedEmployees = await usersCol.countDocuments({
      role: { $in: ["Employee", "HR"] },
      isVerified: { $ne: true },
      fired: { $ne: true },
    });
    // Count HRs
    const hrCount = await usersCol.countDocuments({
      role: "HR",
      fired: { $ne: true },
    });
    res.json({
      success: true,
      totalEmployees,
      verifiedEmployees,
      unverifiedEmployees,
      hrCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard stats",
      error: err.message,
    });
  }
};
