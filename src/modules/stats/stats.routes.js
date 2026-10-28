import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as stats from "./stats.service.js";

export const statsRouter = Router();

statsRouter.use(authenticate());

const meQuery = z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

statsRouter.get("/me", requireRole("Employee"), validate({ query: meQuery }), async (req, res) => {
  res.json(await stats.employeeStats(req.user, req.valid.query));
});

const payrollQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional(), month: z.coerce.number().int().min(1).max(12).optional() });

statsRouter.get("/payroll", requireRole("HR", "admin"), validate({ query: payrollQuery }), async (req, res) => {
  res.json(await stats.payrollStats(req.user, req.valid.query));
});

statsRouter.get("/activity", requireRole("admin"), async (req, res) => {
  res.json({ items: await stats.activity() });
});
