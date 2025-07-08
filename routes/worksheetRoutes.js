const express = require("express");
const {
  getWorksheetsByEmployee,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
} = require("../controllers/worksheetController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const { requireEmployeeRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all worksheets for an employee
router.get(
  "/:employeeEmail",
  verifyFirebaseToken,
  requireEmployeeRole,
  getWorksheetsByEmployee
);

// Create a new worksheet entry
router.post("/", verifyFirebaseToken, requireEmployeeRole, createWorksheet);

// Update a worksheet entry
router.put("/:id", verifyFirebaseToken, requireEmployeeRole, updateWorksheet);

// Delete a worksheet entry
router.delete(
  "/:id",
  verifyFirebaseToken,
  requireEmployeeRole,
  deleteWorksheet
);

module.exports = router;
