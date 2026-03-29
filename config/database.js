const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@paynode.iyxgayg.mongodb.net/?retryWrites=true&w=majority&appName=PayNode`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let database = null;

const connectDB = async () => {
  try {
    database = client.db("paynode");

    const usersCol = database.collection("users");
    const worksheetsCol = database.collection("worksheets");
    const paymentsCol = database.collection("payments");
    const payrollCol = database.collection("payroll_approvals");

    await Promise.all([
      usersCol.createIndex({ email: 1 }, { unique: true }),
      usersCol.createIndex({ role: 1 }),
      usersCol.createIndex({ fired: 1 }),
      usersCol.createIndex({ firebaseUid: 1 }),

      worksheetsCol.createIndex({ employeeEmail: 1, date: -1 }),
      worksheetsCol.createIndex({ employeeEmail: 1, status: 1 }),

      paymentsCol.createIndex({ employeeEmail: 1, date: -1 }),

      payrollCol.createIndex({ status: 1 }),
      payrollCol.createIndex({ employeeEmail: 1 }),
    ]);

    console.log("Database connected with indexes");
    return database;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!database) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return database;
};

module.exports = {
  connectDB,
  getDB,
  client,
};
