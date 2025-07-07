const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Import configurations and routes
const { connectDB } = require("./config/database");
const { initializeFirebase } = require("./config/firebase");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = process.env.PORT || 5000;

// Initialize Firebase Admin SDK
initializeFirebase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/", routes);

// Error handling middleware (should be last)
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the Express server
    app.listen(port, () => {
      console.log(`PayNode server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
