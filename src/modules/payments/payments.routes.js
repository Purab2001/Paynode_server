import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listQuery, mineQuery } from "./payments.schema.js";
import * as payments from "./payments.service.js";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate());

paymentsRouter.get("/mine", requireRole("Employee"), validate({ query: mineQuery }), async (req, res) => {
  res.json(await payments.listMine(req.user, req.valid.query));
});

paymentsRouter.get("/", requireRole("HR", "admin"), validate({ query: listQuery }), async (req, res) => {
  res.json(await payments.list(req.valid.query));
});
