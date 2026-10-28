import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { idParams, listQuery, roleBody, salaryBody, statusBody, verificationBody } from "./employees.schema.js";
import * as employees from "./employees.service.js";

export const employeesRouter = Router();

employeesRouter.use(authenticate(), requireRole("HR", "admin"));

employeesRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  res.json(await employees.list(req.user, req.valid.query));
});

employeesRouter.get("/stats", async (req, res) => {
  res.json(await employees.stats(req.user));
});

employeesRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  res.json(await employees.get(req.valid.params.id, req.user));
});

// HR and admins
employeesRouter.patch("/:id/verification", validate({ params: idParams, body: verificationBody }), async (req, res) => {
  res.json(await employees.setVerification(req.valid.params.id, req.valid.body.isVerified, req.user));
});

// Admins only
employeesRouter.patch("/:id/role", requireRole("admin"), validate({ params: idParams, body: roleBody }), async (req, res) => {
  res.json(await employees.setRole(req.valid.params.id, req.valid.body.role, req.user));
});

employeesRouter.patch("/:id/salary", requireRole("admin"), validate({ params: idParams, body: salaryBody }), async (req, res) => {
  res.json(await employees.raiseSalary(req.valid.params.id, req.valid.body.salary, req.user));
});

employeesRouter.patch("/:id/status", requireRole("admin"), validate({ params: idParams, body: statusBody }), async (req, res) => {
  res.json(await employees.setStatus(req.valid.params.id, req.valid.body.isActive, req.user));
});
