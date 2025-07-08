const { getDB } = require("../config/database");

// Middleware to check if user has "employee" role
async function requireEmployeeRole(req, res, next) {
  try {
    console.log("RoleMiddleware: Checking employee role. user:", req.user, "body:", req.body, "params:", req.params);
    // Get user email from request (assume JWT decoded and email is available)
    const email =
      (req.user && req.user.email) ||
      (req.body && req.body.employeeEmail) ||
      (req.params && req.params.employeeEmail);
    if (!email) {
      console.log("RoleMiddleware: No user email found.");
      return res.status(401).json({ success: false, message: "Unauthorized: No user email found" });
    }
    const user = await getDB().collection("users").findOne({ email });
    if (!user || user.role !== "Employee") {
      console.log("RoleMiddleware: User not found or not Employee. user:", user);
      return res.status(403).json({ success: false, message: "Forbidden: Employee access only" });
    }
    console.log("RoleMiddleware: User authorized:", user.email);
    next();
  } catch (err) {
    console.error("RoleMiddleware: Error during role check:", err);
    res.status(500).json({ success: false, message: "Role check failed", error: err.message });
  }
}

module.exports = { requireEmployeeRole };