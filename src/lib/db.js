import mongoose from "mongoose";
import { env } from "../config/env.js";

// Cache the connection across warm serverless invocations.
let cached = globalThis.__mongoose;
if (!cached) cached = globalThis.__mongoose = { conn: null, promise: null };

export async function connectDB(uri = env.MONGODB_URI) {
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri, {
    dbName: env.MONGODB_DB,
    bufferCommands: false,
    autoIndex: env.NODE_ENV !== "production",
  });
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow a retry on the next request
    throw err;
  }
  return cached.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cached.conn = null;
  cached.promise = null;
}
