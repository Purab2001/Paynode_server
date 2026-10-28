import { ZodError, z } from "zod";
import mongoose from "mongoose";
import { HttpError } from "../lib/errors.js";

// All errors use one shape: { error: { code, message, details? } }
const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details && { details }) } });

export function notFound(req, res) {
  send(res, 404, "NOT_FOUND", `No route for ${req.method} ${req.path}`);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return send(res, err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    return send(res, 400, "VALIDATION_FAILED", "Some fields are missing or invalid.", z.flattenError(err).fieldErrors);
  }
  if (err instanceof mongoose.Error.CastError) return send(res, 400, "BAD_REQUEST", `Invalid ${err.path}.`);
  if (err?.code === 11000) return send(res, 409, "CONFLICT", "That record already exists.");
  if (err?.type === "entity.parse.failed") return send(res, 400, "BAD_REQUEST", "Request body is not valid JSON.");

  console.error(err);
  send(res, 500, "INTERNAL", "Something went wrong on our side. Please try again.");
}
