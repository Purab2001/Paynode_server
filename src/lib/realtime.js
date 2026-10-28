import { env } from "../config/env.js";

/**
 * Ask the chat server to disconnect a user right now (used when an account is deactivated).
 * Best effort: if chat isn't configured or is down, the user is still blocked at their next action.
 */
export async function disconnectFromChat(userId) {
  if (!env.REALTIME_URL || !env.REALTIME_SECRET) return;
  try {
    await fetch(`${env.REALTIME_URL}/internal/kick`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-realtime-secret": env.REALTIME_SECRET },
      body: JSON.stringify({ userId: String(userId) }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.warn(`Could not disconnect ${userId} from chat:`, err.message);
  }
}
