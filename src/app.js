import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { allowedOrigins, env } from "./config/env.js";
import { ensureDb } from "./middleware/connectDb.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { employeesRouter } from "./modules/employees/employees.routes.js";
import { worksheetsRouter } from "./modules/worksheets/worksheets.routes.js";
import { payrollRouter } from "./modules/payroll/payroll.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { contactRouter } from "./modules/contact/contact.routes.js";
import { statsRouter } from "./modules/stats/stats.routes.js";
import { stripeWebhook } from "./modules/payments/stripe.webhook.js";

const app = express();

app.set("trust proxy", 1); // behind Vercel's proxy; needed for per-IP rate limiting
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." } },
  }),
);

// The webhook needs the raw body to verify Stripe's signature, so it goes BEFORE express.json().
app.use("/api/stripe/webhook", stripeWebhook);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => res.json({ name: "PayNode API", status: "ok" }));

app.use("/api", ensureDb);
app.use("/api/users", usersRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/worksheets", worksheetsRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contact", contactRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
