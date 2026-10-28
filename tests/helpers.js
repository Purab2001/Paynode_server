import { vi } from "vitest";

/**
 * Fake Firebase Admin Auth. A token is "test:<uid>:<email>"; anything else is rejected.
 * Use with: vi.mock("../src/lib/firebase.js", () => firebaseMock)
 */
export const fakeAuth = {
  verifyIdToken: vi.fn(async (token) => {
    const [prefix, uid, email] = token.split(":");
    if (prefix !== "test" || !uid) throw new Error("invalid token");
    return { uid, email, name: "Token Name", firebase: { sign_in_provider: "password" } };
  }),
  setCustomUserClaims: vi.fn(async () => {}),
  revokeRefreshTokens: vi.fn(async () => {}),
};

export const firebaseMock = {
  getFirebaseAuth: () => fakeAuth,
  syncRoleClaim: vi.fn(async () => {}),
};

export const bearer = (uid, email = `${uid}@company.com`) => ({ Authorization: `Bearer test:${uid}:${email}` });

export const profile = {
  name: "Jane Cooper",
  designation: "Product Designer",
  salary: 4500,
  bankAccount: "0123456789",
};

/** Insert a user directly (bypasses the API) for role-specific scenarios. */
export async function seedUser(User, { uid, role = "Employee", ...rest }) {
  const user = new User({
    firebaseUid: uid,
    email: `${uid}@company.com`,
    name: rest.name ?? uid,
    designation: "Staff",
    salary: 4000,
    role,
    isVerified: role !== "Employee",
    ...rest,
  });
  user.setBankAccount("1111222233");
  return user.save();
}
