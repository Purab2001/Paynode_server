const { getDB } = require("../config/database");

// Middleware to check if user has "employee" role and is accessing their own data
async function requireEmployeeRole(req, res, next) {
  try {
    // Get user email from JWT and from request params/body
    const userEmail = req.user && req.user.email;
    const paramEmail =
      (req.params && req.params.employeeEmail) ||
      (req.body && req.body.employeeEmail);

    if (!userEmail) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No user email found" });
    }

    // Only allow if the user is accessing their own data
    if (paramEmail && userEmail !== paramEmail) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Can only access your own worksheet data" });
    }

    const user = await getDB().collection("users").findOne({ email: userEmail });
    if (!user || user.role !== "Employee") {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Employee access only" });
    }
    next();
  } catch (err) {
    console.error("RoleMiddleware: Error during role check:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Role check failed",
        error: err.message,
      });
  }
}

// Middleware to check if user has "HR" role
async function requireHRRole(req, res, next) {
  try {
    const email = req.user && req.user.email;
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user email found" });
    }
    const user = await getDB().collection("users").findOne({ email });
    if (!user || user.role !== "HR") {
      return res.status(403).json({ success: false, message: "Forbidden: HR access only" });
    }
    next();
  } catch (err) {
    console.error("RoleMiddleware: Error during HR role check:", err);
    res.status(500).json({
      success: false,
      message: "Role check failed",
      error: err.message,
    });
  }
}

async function requireAdminRole(req, res, next) {
  try {
    const email = req.user && req.user.email;
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user email found" });
    }
    const user = await getDB().collection("users").findOne({ email });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admin access only" });
    }
    next();
  } catch (err) {
    console.error("RoleMiddleware: Error during admin role check:", err);
    res.status(500).json({
      success: false,
      message: "Role check failed",
      error: err.message,
    });
  }
}

module.exports = { requireEmployeeRole, requireHRRole, requireAdminRole };
