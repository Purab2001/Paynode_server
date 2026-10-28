import express, { Router } from "express";
import { env } from "../../config/env.js";
import { getStripe } from "../../lib/stripe.js";
import { ensureDb } from "../../middleware/connectDb.js";
import { HttpError } from "../../lib/errors.js";
import { recordSucceededIntent } from "./payments.service.js";

export const stripeWebhook = Router();

/**
 * Stripe is the source of truth for "was this paid". The body must stay raw so the signature
 * can be checked, which is why app.js mounts this before express.json().
 */
stripeWebhook.post("/", express.raw({ type: "application/json", limit: "1mb" }), ensureDb, async (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, "Webhook is not configured.", "WEBHOOK_NOT_CONFIGURED");

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.get("stripe-signature") ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new HttpError(400, "Invalid signature.", "INVALID_SIGNATURE");
  }

  if (event.type === "payment_intent.succeeded") {
    const outcome = await recordSucceededIntent(event.data.object);
    if (outcome === "amount-mismatch" || outcome === "not-payable" || outcome === "unknown-request") {
      // Money moved but the request can't take it. Surface loudly so someone refunds or reconciles.
      console.error(`Stripe payment ${event.data.object.id} could not be applied: ${outcome}`);
    }
  }
  res.json({ received: true });
});
