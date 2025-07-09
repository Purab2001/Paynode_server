// Employee dashboard and overview controller
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/database");

// Helper to get collections
const getCollection = (name) => getDB().collection(name);

// GET /api/employee/stats/:email
async function getEmployeeStats(req, res) {
  try {
    const email = req.params.email;
    const worksheetCol = getCollection("worksheets");
    const paymentCol = getCollection("payments");

    // DEBUG: Log all worksheet docs for this user
    const allDocs = await worksheetCol.find({ employeeEmail: email }).toArray();
    // Hours and entries this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hoursAgg = await worksheetCol
      .aggregate([
        { $addFields: { dateObj: { $toDate: "$date" } } },
        { $match: { employeeEmail: email, dateObj: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalHours: { $sum: "$hoursWorked" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const hoursThisMonth = hoursAgg[0]?.totalHours || 0;
    const entriesThisMonth = hoursAgg[0]?.count || 0;

    // Last payment
    const lastPayment = await paymentCol
      .find({ employeeEmail: email })
      .sort({ date: -1 })
      .limit(1)
      .toArray();
    const lastPaymentAmount = lastPayment[0]?.amount || null;
    const lastPaymentDate = lastPayment[0]?.date
      ? new Date(lastPayment[0].date).toLocaleDateString()
      : null;

    // Pending tasks (example: entries with status "pending")
    const pendingTasks = await worksheetCol.countDocuments({
      employeeEmail: email,
      status: "pending",
    });

    res.json({
      hoursThisMonth,
      entriesThisMonth,
      lastPaymentAmount,
      lastPaymentDate,
      pendingTasks,
    });
  } catch (err) {
    console.error("[getEmployeeStats] Error", err);
    res
      .status(500)
      .json({ error: "Failed to fetch employee stats", details: err.message });
  }
}

// GET /api/employee/recent-activity/:email
async function getEmployeeRecentActivity(req, res) {
  try {
    const email = req.params.email;
    const worksheetCol = getCollection("worksheets");
    const paymentCol = getCollection("payments");

    // Recent work entries
    const recentWorks = await worksheetCol
      .find({ employeeEmail: email })
      .sort({ date: -1 })
      .limit(5)
      .toArray();
    // Recent payments
    const recentPays = await paymentCol
      .find({ employeeEmail: email })
      .sort({ date: -1 })
      .limit(2)
      .toArray();

    const activity = [
      ...recentWorks.map((w) => ({
        icon: "📝",
        title: w.task,
        description: `Worked ${w.hoursWorked}h`,
        date: new Date(w.date).toLocaleDateString(),
      })),
      ...recentPays.map((p) => ({
        icon: "💸",
        title: "Salary Payment",
        description: `Received ৳${p.amount}`,
        date: new Date(p.date).toLocaleDateString(),
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7);

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
}

// GET /api/employee/work-summary/:email
async function getEmployeeWorkSummary(req, res) {
  try {
    const email = req.params.email;
    const worksheetCol = getCollection("worksheets");

    // This week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekAgg = await worksheetCol
      .aggregate([
        { $addFields: { dateObj: { $toDate: "$date" } } },
        { $match: { employeeEmail: email, dateObj: { $gte: weekStart } } },
        { $group: { _id: null, totalHours: { $sum: "$hoursWorked" } } },
      ])
      .toArray();
    const hoursThisWeek = weekAgg[0]?.totalHours || 0;

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAgg = await worksheetCol
      .aggregate([
        { $addFields: { dateObj: { $toDate: "$date" } } },
        { $match: { employeeEmail: email, dateObj: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalHours: { $sum: "$hoursWorked" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();
    const hoursThisMonth = monthAgg[0]?.totalHours || 0;
    const tasksCompleted = monthAgg[0]?.count || 0;

    // Efficiency (dummy: tasks completed / 20)
    const efficiency = tasksCompleted
      ? Math.round((tasksCompleted / 20) * 100) + "%"
      : "N/A";

    res.json({ hoursThisWeek, hoursThisMonth, tasksCompleted, efficiency });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch work summary" });
  }
}

// GET /api/employee/recent-work/:email
async function getEmployeeRecentWork(req, res) {
  try {
    const email = req.params.email;
    const worksheetCol = getCollection("worksheets");
    const recent = await worksheetCol
      .aggregate([
        { $match: { employeeEmail: email } },
        { $addFields: { dateObj: { $toDate: "$date" } } },
        { $sort: { dateObj: -1 } },
        { $limit: 5 },
      ])
      .toArray();
    const result = recent.map((w) => ({
      task: w.task,
      description: w.description || "",
      status: w.status || "Completed",
      date: w.dateObj
        ? new Date(w.dateObj).toLocaleDateString()
        : w.date
        ? new Date(w.date).toLocaleDateString()
        : "",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent work" });
  }
}

/**
 * GET /api/employee/all
 * Returns all employees (for HR/Admin)
 */
async function getAllEmployees(req, res) {
  try {
    const usersCol = getCollection("users");
    const employees = await usersCol
      .find({ role: { $in: ["Employee", "HR"] } })
      .toArray();
    res.json({ success: true, employees });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch employees",
        error: err.message,
      });
  }
}

/**
 * PUT /api/employee/:email/verify
 * Toggle isVerified for an employee
 */
async function toggleEmployeeVerification(req, res) {
  try {
    const { email } = req.params;
    const { isVerified } = req.body;
    if (typeof isVerified !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isVerified must be boolean" });
    }
    const usersCol = getCollection("users");
    const result = await usersCol.updateOne(
      { email },
      { $set: { isVerified } }
    );
    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update verification",
        error: err.message,
      });
  }
}

/**
 * GET /api/employee/:slug
 * Get employee by email or uid
 */
async function getEmployeeBySlug(req, res) {
  try {
    const { slug } = req.params;
    const usersCol = getCollection("users");
    // Try email first, then uid
    let user = await usersCol.findOne({ email: slug });
    if (!user) {
      user = await usersCol.findOne({ uid: slug });
    }
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch employee",
        error: err.message,
      });
  }
}

module.exports = {
  getEmployeeStats,
  getEmployeeRecentActivity,
  getEmployeeWorkSummary,
  getEmployeeRecentWork,
  getAllEmployees,
  toggleEmployeeVerification,
  getEmployeeBySlug,
};
