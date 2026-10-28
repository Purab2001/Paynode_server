import Stripe from "stripe";
import { env } from "../config/env.js";

let client;

/** One shared Stripe client per serverless instance. */
export function getStripe() {
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
