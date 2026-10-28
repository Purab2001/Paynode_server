import mongoose from "mongoose";

// A salary payment that Stripe has confirmed. Only the webhook writes these.
const paymentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    payrollRequest: { type: mongoose.Schema.Types.ObjectId, ref: "PayrollRequest", required: true, unique: true },
    amount: { type: Number, required: true },
    period: { year: { type: Number, required: true }, month: { type: Number, required: true } },
    transactionId: { type: String, required: true, unique: true },
    paidAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        ret.employee = String(ret.employee);
        delete ret._id;
        delete ret.__v;
        delete ret.payrollRequest;
        return ret;
      },
    },
  },
);

paymentSchema.index({ employee: 1, "period.year": -1, "period.month": -1 });

export const Payment = mongoose.models.Payment ?? mongoose.model("Payment", paymentSchema);
