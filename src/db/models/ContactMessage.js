import mongoose from "mongoose";

export const TOPICS = ["sales", "support", "billing", "other"];
export const CONTACT_STATUSES = ["new", "read", "archived"];

// Messages from the public contact form. Anyone can create one; only admins can read them.
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    size: { type: String, trim: true, maxlength: 40, default: "" },
    topic: { type: String, enum: TOPICS, required: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: { type: String, enum: CONTACT_STATUSES, default: "new", index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

contactSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.models.ContactMessage ?? mongoose.model("ContactMessage", contactSchema);
