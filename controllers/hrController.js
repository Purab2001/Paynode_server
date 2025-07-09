const { getDB } = require("../config/database");

// GET /api/hr/dashboard-stats
async function getHRDashboardStats(req, res) {
  try {
    const usersCol = getDB().collection("users");
    const totalEmployees = await usersCol.countDocuments({ role: "Employee" });
    const verifiedEmployees = await usersCol.countDocuments({ role: "Employee", isVerified: true });
    const unverifiedEmployees = await usersCol.countDocuments({ role: "Employee", isVerified: false });

    res.json({
      totalEmployees,
      verifiedEmployees,
      unverifiedEmployees,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch HR dashboard stats", error: error.message });
  }
}

module.exports = { getHRDashboardStats };