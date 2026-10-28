import mongoose from "mongoose";

export const TASKS = ["Development", "Sales", "Support", "Content", "Paper-work", "Research"];
export const WORKSHEET_STATUSES = ["submitted", "approved", "rejected"];

const worksheetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
    task: { type: String, enum: TASKS, required: true },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    // Calendar day, stored as UTC midnight and serialized as YYYY-MM-DD.
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    status: { type: String, enum: WORKSHEET_STATUSES, default: "submitted", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        ret.date = ret.date.toISOString().slice(0, 10);
        // A populated user becomes `employee`; an unpopulated one stays a plain id.
        if (ret.user && typeof ret.user === "object" && ret.user.name) {
          ret.employee = ret.user;
          delete ret.user;
        } else {
          ret.user = String(ret.user);
        }
        delete ret._id;
        delete ret.__v;
        delete ret.reviewedBy;
        return ret;
      },
    },
  },
);

worksheetSchema.index({ user: 1, date: -1 });
worksheetSchema.index({ date: -1 });

export const Worksheet = mongoose.models.Worksheet ?? mongoose.model("Worksheet", worksheetSchema);
