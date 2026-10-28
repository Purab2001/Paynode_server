import mongoose from "mongoose";

// Append-only record of sensitive changes (roles, salaries, access, verification).
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    from: mongoose.Schema.Types.Mixed,
    to: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model("AuditLog", auditLogSchema);

export const audit = (actor, action, target, from, to) =>
  AuditLog.create({ actor: actor._id, action, target: target._id, from, to });
