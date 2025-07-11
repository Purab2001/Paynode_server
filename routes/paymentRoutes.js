const express = require("express");
const {
  getPaymentsByEmployee,
  getPaymentsByEmployeePaginated,
} = require("../controllers/paymentController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { getDB } = require("../config/database");
const { requireEmployeeRole } = require("../middleware/roleMiddleware");

const router = express.Router();

const { requireAdminRole } = require("../middleware/roleMiddleware");

/**
 * Middleware to ensure req.user.role is set by looking up the user in the DB.
 */
async function attachUserRole(req, res, next) {
  if (req.user && req.user.email && !req.user.role) {
    try {
      const userDoc = await getDB().collection("users").findOne({ email: req.user.email });
      if (userDoc && userDoc.role) {
        req.user.role = userDoc.role;
      }
    } catch (err) {
      console.error("[attachUserRole] Failed to fetch user role:", err);
    }
  }
  next();
}

// Middleware to allow either employee or admin
function requireEmployeeOrAdminOrHR(req, res, next) {
  const user = req.user;
  const paramEmail =
    (req.params && req.params.employeeEmail) ||
    (req.body && req.body.employeeEmail);
  if (!user || !user.email) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  // Only HR and admin can see all, employees only their own
  if (user.role === "admin" || user.role === "HR") return next();
  if (
    user.role === "Employee" &&
    user.email &&
    paramEmail &&
    user.email.toLowerCase() === paramEmail.toLowerCase()
  ) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden" });
}

  // Get all payments for an employee (employee, admin, or HR)
 router.get(
   "/:employeeEmail",
   verifyFirebaseToken,
   attachUserRole,
   requireEmployeeOrAdminOrHR,
   getPaymentsByEmployee
 );
 
 // Get paginated payments for an employee (employee, admin, or HR)
 router.get(
   "/:employeeEmail/paginated",
   verifyFirebaseToken,
   attachUserRole,
   requireEmployeeOrAdminOrHR,
   getPaymentsByEmployeePaginated
 );

module.exports = router;
