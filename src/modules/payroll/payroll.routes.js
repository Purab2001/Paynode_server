import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createBody, idParams, listQuery, rejectBody } from "./payroll.schema.js";
import * as payroll from "./payroll.service.js";

export const payrollRouter = Router();

payrollRouter.use(authenticate(), requireRole("HR", "admin"));

// HR asks; admins decide and pay.
payrollRouter.post("/", requireRole("HR"), validate({ body: createBody }), async (req, res) => {
  res.status(201).json(await payroll.create(req.user, req.valid.body));
});

payrollRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  res.json(await payroll.list(req.user, req.valid.query));
});

payrollRouter.get("/:id", requireRole("admin"), validate({ params: idParams }), async (req, res) => {
  res.json(await payroll.get(req.valid.params.id));
});

payrollRouter.post("/:id/payment-intent", requireRole("admin"), validate({ params: idParams }), async (req, res) => {
  res.json(await payroll.createPaymentIntent(req.valid.params.id));
});

payrollRouter.patch("/:id/reject", requireRole("admin"), validate({ params: idParams, body: rejectBody }), async (req, res) => {
  res.json(await payroll.reject(req.valid.params.id, req.valid.body.reason, req.user));
});
