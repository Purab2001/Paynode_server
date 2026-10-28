import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createBody, idParams, mineQuery, reviewBody, summaryQuery, teamQuery, updateBody } from "./worksheets.schema.js";
import * as worksheets from "./worksheets.service.js";

export const worksheetsRouter = Router();

worksheetsRouter.use(authenticate());

// Employees: their own entries only. Ownership is enforced in the service, not by trusting an id from the client.
worksheetsRouter.get("/mine", requireRole("Employee"), validate({ query: mineQuery }), async (req, res) => {
  res.json(await worksheets.listMine(req.user, req.valid.query));
});

worksheetsRouter.get("/mine/summary", requireRole("Employee"), validate({ query: summaryQuery }), async (req, res) => {
  res.json(await worksheets.summary(req.user, req.valid.query));
});

worksheetsRouter.post("/", requireRole("Employee"), validate({ body: createBody }), async (req, res) => {
  res.status(201).json(await worksheets.create(req.user, req.valid.body));
});

worksheetsRouter.patch("/:id", requireRole("Employee"), validate({ params: idParams, body: updateBody }), async (req, res) => {
  res.json(await worksheets.update(req.valid.params.id, req.user, req.valid.body));
});

worksheetsRouter.delete("/:id", requireRole("Employee"), validate({ params: idParams }), async (req, res) => {
  await worksheets.remove(req.valid.params.id, req.user);
  res.status(204).end();
});

// HR and admins: everyone's entries, with review.
worksheetsRouter.get("/", requireRole("HR", "admin"), validate({ query: teamQuery }), async (req, res) => {
  res.json(await worksheets.listTeam(req.valid.query));
});

worksheetsRouter.patch("/:id/status", requireRole("HR", "admin"), validate({ params: idParams, body: reviewBody }), async (req, res) => {
  res.json(await worksheets.review(req.valid.params.id, req.valid.body.status, req.user));
});
