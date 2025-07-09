// Payroll approval controller

const { getDB } = require("../config/database");
const { ObjectId } = require("mongodb");

// POST /api/payroll/request
async function createPayrollRequest(req, res) {
  try {
    const { employeeEmail, employeeName, salary, month, year, requestedBy } = req.body;
    if (!employeeEmail || !salary || !month || !year || !requestedBy) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const payrollCol = getDB().collection("payroll_approvals");

    // Prevent duplicate payroll requests for the same employee/month/year
    const existing = await payrollCol.findOne({
      employeeEmail,
      month,
      year,
      status: { $in: ["pending", "approved"] }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Payroll request for this employee, month, and year already exists."
      });
    }

    const newRequest = {
      employeeEmail,
      employeeName,
      salary,
      month,
      year,
      status: "pending",
      requestedBy,
      createdAt: new Date(),
      processedAt: null,
      processedBy: null,
    };
    const result = await payrollCol.insertOne(newRequest);
    res.status(201).json({ success: true, requestId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create payroll request", error: error.message });
  }
}

// GET /api/payroll/pending
async function getPendingPayrollRequests(req, res) {
  try {
    const payrollCol = getDB().collection("payroll_approvals");
    const pending = await payrollCol.find({ status: "pending" }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, requests: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pending payroll requests", error: error.message });
  }
}

// PUT /api/payroll/:id/approve
async function approvePayrollRequest(req, res) {
  try {
    const { id } = req.params;
    const { status, processedBy } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const payrollCol = getDB().collection("payroll_approvals");
    const result = await payrollCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, processedAt: new Date(), processedBy } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Payroll request not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update payroll request", error: error.message });
  }
}

module.exports = {
  createPayrollRequest,
  getPendingPayrollRequests,
  approvePayrollRequest,
};