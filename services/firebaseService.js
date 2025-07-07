const { admin } = require("../config/firebase");

const createFirebaseUser = async (email, password, displayName) => {
  try {
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    return firebaseUser;
  } catch (error) {
    throw new Error(`Firebase user creation failed: ${error.message}`);
  }
};

const getFirebaseUserByEmail = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return null;
    }
    throw new Error(`Firebase user lookup failed: ${error.message}`);
  }
};

module.exports = {
  createFirebaseUser,
  getFirebaseUserByEmail,
};
