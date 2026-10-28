import mongoose from "mongoose";

export const PAYROLL_STATUSES = ["pending", "paid", "rejected"];

const ref = (extra = {}) => ({ type: mongoose.Schema.Types.ObjectId, ref: "User", ...extra });

const payrollSchema = new mongoose.Schema(
  {
    employee: ref({ required: true, immutable: true, index: true }),
    // Salary at the moment of the request. Later raises don't change an open request.
    amount: { type: Number, required: true, min: 0.01, immutable: true },
    period: {
      year: { type: Number, required: true, immutable: true },
      month: { type: Number, required: true, min: 1, max: 12, immutable: true }, // 1–12
    },
    status: { type: String, enum: PAYROLL_STATUSES, default: "pending", index: true },
    requestedBy: ref({ required: true, immutable: true, index: true }),
    decidedBy: ref(),
    decidedAt: Date,
    rejectReason: { type: String, trim: true, maxlength: 200 },
    paymentIntentId: String,
    paidAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        for (const key of ["employee", "requestedBy"]) {
          if (ret[key] && typeof ret[key] === "object" && ret[key].name) continue; // populated
          ret[key] = String(ret[key]);
        }
        delete ret._id;
        delete ret.__v;
        delete ret.paymentIntentId; // internal Stripe reference; the client never needs it
        delete ret.decidedBy;
        return ret;
      },
    },
  },
);

// One live request per person per month. Rejected ones don't count, so HR can ask again.
payrollSchema.index(
  { employee: 1, "period.year": 1, "period.month": 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "paid"] } } },
);

export const PayrollRequest = mongoose.models.PayrollRequest ?? mongoose.model("PayrollRequest", payrollSchema);
