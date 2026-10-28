import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const key = () => Buffer.from(env.DATA_ENCRYPTION_KEY, "base64");

/** Encrypt a short secret (e.g. a bank account number). Output: v1:iv:tag:ciphertext (base64). */
export function encrypt(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload) {
  const [version, iv, tag, data] = String(payload).split(":");
  if (version !== VERSION) throw new Error("Unsupported ciphertext version");
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
