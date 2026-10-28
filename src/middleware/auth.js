import { getFirebaseAuth } from "../lib/firebase.js";
import { forbidden, unauthenticated } from "../lib/errors.js";
import { User } from "../db/models/User.js";

/**
 * Verifies the Firebase ID token and loads the PayNode user.
 * Sets req.auth (token identity) and req.user (database user).
 * With allowUnregistered, a valid token without a profile passes through (req.user = null),
 * which is how a new account creates its profile.
 */
export function authenticate({ allowUnregistered = false } = {}) {
  return async (req, res, next) => {
    const [scheme, token] = (req.get("authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw unauthenticated();

    let decoded;
    try {
      decoded = await getFirebaseAuth().verifyIdToken(token);
    } catch {
      throw unauthenticated("Your session has expired. Please sign in again.");
    }
    if (!decoded.email) throw forbidden("Your account needs an email address to use PayNode.");

    req.auth = {
      uid: decoded.uid,
      email: decoded.email.toLowerCase(),
      name: decoded.name,
      picture: decoded.picture,
      provider: decoded.firebase?.sign_in_provider,
    };

    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      if (allowUnregistered) {
        req.user = null;
        return next();
      }
      throw forbidden("Finish setting up your profile to continue.", "PROFILE_INCOMPLETE");
    }
    if (!user.isActive) {
      throw forbidden("This account has been deactivated. Contact your administrator.", "ACCOUNT_DEACTIVATED");
    }

    // Accounts created before a photo was saved (e.g. seeded admins) pick up the Google photo.
    if (!user.photoUrl && req.auth.picture?.startsWith("https://")) {
      user.photoUrl = req.auth.picture;
      await user.save();
    }

    req.user = user;
    next();
  };
}

/** Allow only the given roles. Must run after authenticate(). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };
}
