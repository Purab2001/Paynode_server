const { getDB } = require("../config/database");

// Middleware to check if user has "employee" role
async function requireEmployeeRole(req, res, next) {
  try {
    // Get user email from request (assume JWT decoded and email is available)
    const email = req.user?.email || req.body.employeeEmail || req.params.employeeEmail;
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user email found" });
    }
    const user = await getDB().collection("users").findOne({ email });
    if (!user || user.role !== "Employee") {
      return res.status(403).json({ success: false, message: "Forbidden: Employee access only" });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Role check failed", error: err.message });
  }
}

module.exports = { requireEmployeeRole };