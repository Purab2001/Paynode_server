const { getDB } = require("../config/database");
const { ObjectId } = require("mongodb");

// Get all worksheet entries for an employee
const getWorksheetsByEmployee = async (req, res) => {
  try {
    const { employeeEmail } = req.params;
    const worksheets = await getDB()
      .collection("worksheets")
      .find({ employeeEmail })
      .sort({ date: -1 })
      .toArray();
    console.log(
      "Fetched worksheets for:",
      employeeEmail,
      "Count:",
      worksheets.length
    );
    res.json({ success: true, worksheets });
  } catch (error) {
    console.error("Error fetching worksheets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch worksheets",
      error: error.message,
    });
  }
};

// Create a new worksheet entry
const createWorksheet = async (req, res) => {
  try {
    const { employeeEmail, task, hoursWorked, date } = req.body;
    if (!employeeEmail || !task || !hoursWorked || !date) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const worksheet = {
      employeeEmail,
      task,
      hoursWorked,
      date: new Date(date),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await getDB().collection("worksheets").insertOne(worksheet);
    res.status(201).json({ success: true, worksheetId: result.insertedId });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create worksheet",
      error: error.message,
    });
  }
};

// Update a worksheet entry
const updateWorksheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { task, hoursWorked, date } = req.body;
    const updateDoc = {
      $set: {
        ...(task && { task }),
        ...(hoursWorked && { hoursWorked }),
        ...(date && { date: new Date(date) }),
        updatedAt: new Date(),
      },
    };
    const result = await getDB()
      .collection("worksheets")
      .updateOne({ _id: new ObjectId(id) }, updateDoc);
    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Worksheet not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update worksheet",
      error: error.message,
    });
  }
};

// Delete a worksheet entry
const deleteWorksheet = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Deleting worksheet with ID:", id);
    console.log("User:", req.user);

    const result = await getDB()
      .collection("worksheets")
      .deleteOne({ _id: new ObjectId(id) });
    console.log("Delete result:", result);

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Worksheet not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Delete worksheet error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete worksheet",
      error: error.message,
    });
  }
};

module.exports = {
  getWorksheetsByEmployee,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
};
