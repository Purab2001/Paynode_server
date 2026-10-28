import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  // Comma-separated list of allowed browser origins.
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1),
  // Database name, so the app never writes to the driver's default "test" database.
  MONGODB_DB: z.string().min(1).default("paynode"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Chat server (the realtime/ folder). Optional: without them, deactivated users are still blocked at their next action.
  REALTIME_URL: z.string().url().optional(),
  REALTIME_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_NAME: z.string().optional(),
  // 32 random bytes, base64-encoded. Generate with:
  // node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const allowedOrigins = env.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);
