const admin = require("firebase-admin");

// Middleware to verify Firebase token and attach user info to request
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request (including custom claims)
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role || "Employee",
    };

    // Block login if user is fired
    const db = require("../config/database").getDB();
    const userDoc = await db.collection("users").findOne({ email: decodedToken.email });
    if (userDoc && userDoc.fired) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Your account has been deactivated.",
      });
    }

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
};

module.exports = { verifyFirebaseToken };
