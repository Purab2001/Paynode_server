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

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Get the database
    database = client.db("paynode");
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
