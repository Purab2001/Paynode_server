import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { HttpError } from "../../lib/errors.js";
import { createProfileBody, updateProfileBody } from "./users.schema.js";
import * as users from "./users.service.js";

export const usersRouter = Router();

// The signed-in user's own profile. 404 PROFILE_INCOMPLETE means "send them to finish sign-up".
usersRouter.get("/me", authenticate({ allowUnregistered: true }), (req, res) => {
  if (!req.user) throw new HttpError(404, "Finish setting up your profile to continue.", "PROFILE_INCOMPLETE");
  res.json(req.user);
});

usersRouter.post(
  "/me",
  authenticate({ allowUnregistered: true }),
  validate({ body: createProfileBody }),
  async (req, res) => {
    const user = await users.createProfile(req.auth, req.valid.body);
    res.status(201).json(user);
  },
);

usersRouter.patch("/me", authenticate(), validate({ body: updateProfileBody }), async (req, res) => {
  res.json(await users.updateProfile(req.user, req.valid.body));
});
