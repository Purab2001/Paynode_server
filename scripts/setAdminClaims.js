const { initializeFirebase, admin } = require("../config/firebase");
const { getDB } = require("../config/database");

async function setAdminClaims() {
  initializeFirebase();
  const db = require("../config/database");
  await db.connectDB();
  
  const usersCol = db.getDB().collection("users");
  
  const adminUser = await usersCol.findOne({ role: "admin" });
  
  if (!adminUser) {
    console.log("No admin user found");
    return;
  }
  
  console.log("Found admin:", adminUser.email);
  
  if (adminUser.firebaseUid) {
    try {
      await admin.auth().setCustomUserClaims(adminUser.firebaseUid, { role: "admin" });
      console.log("Custom claims set successfully!");
      console.log("User needs to log out and log back in for changes to take effect.");
    } catch (error) {
      console.error("Error setting claims:", error.message);
    }
  } else {
    console.log("No firebaseUid found for admin user");
  }
}

setAdminClaims();
