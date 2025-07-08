const { getDB } = require("../config/database");

// Get all payments for an employee, sorted ascending by date
const getPaymentsByEmployee = async (req, res) => {
  try {
    const { employeeEmail } = req.params;
    const payments = await getDB()
      .collection("payments")
      .find({ employeeEmail })
      .sort({ year: 1, month: 1 })
      .toArray();
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch payments", error: error.message });
  }
};

// Get paginated payments for an employee (5 per page)
const getPaymentsByEmployeePaginated = async (req, res) => {
  try {
    const { employeeEmail } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const paymentsCollection = getDB().collection("payments");
    const total = await paymentsCollection.countDocuments({ employeeEmail });
    const payments = await paymentsCollection
      .find({ employeeEmail })
      .sort({ year: 1, month: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      payments,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch paginated payments", error: error.message });
  }
};

module.exports = {
  getPaymentsByEmployee,
  getPaymentsByEmployeePaginated,
};