import { inject } from "vitest";

// Test-only values, set before src/config/env.js is imported. Real .env values are never used.
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: inject("mongoUri"),
  MONGODB_DB: "paynode-test",
  CLIENT_URL: "http://localhost:5173",
  FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "test-key",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
  REALTIME_URL: "http://realtime.test",
  REALTIME_SECRET: "test-realtime-secret-0123456789",
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
});
