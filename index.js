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

// Stripe setup
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create PaymentIntent endpoint
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount, email } = req.body;
    if (!amount || !email) {
      return res.status(400).json({ error: "Amount and email required" });
    }
    // Stripe expects amount in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: "usd",
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: "Stripe error", details: err.message });
  }
});
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
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
