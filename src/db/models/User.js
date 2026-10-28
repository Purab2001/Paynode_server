import mongoose from "mongoose";
import { decrypt, encrypt } from "../../lib/crypto.js";

export const ROLES = ["Employee", "HR", "admin"];

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, immutable: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ROLES, default: "Employee", index: true },
    designation: { type: String, trim: true, maxlength: 80, default: "" },
    salary: { type: Number, min: 0, default: 0 },
    // Bank number is stored encrypted; only the last four digits are readable.
    bankCipher: { type: String, select: false },
    bankLast4: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    isVerified: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.bankCipher;
        delete ret.firebaseUid;
        return ret;
      },
    },
  },
);

userSchema.methods.setBankAccount = function setBankAccount(number) {
  const digits = String(number).replace(/\D/g, "");
  this.bankCipher = encrypt(digits);
  this.bankLast4 = digits.slice(-4);
};

/** Only call when the full number is actually needed (e.g. a payout). Requires .select("+bankCipher"). */
userSchema.methods.getBankAccount = function getBankAccount() {
  return this.bankCipher ? decrypt(this.bankCipher) : null;
};

userSchema.index({ name: 1 });

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
