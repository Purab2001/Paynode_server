// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error response
  let error = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  // MongoDB duplicate key error
  if (err.code === 11000) {
    error.message = "Duplicate field value entered";
  }

  // Firebase errors
  if (err.code && err.code.startsWith("auth/")) {
    error.message = `Firebase Auth Error: ${err.message}`;
  }

  res.status(err.statusCode || 500).json(error);
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

module.exports = errorHandler;
