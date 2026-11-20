import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    review_id: { type: String, required: true },
    product: { type: String, default: "Unknown Product" },
    rating: { type: mongoose.Schema.Types.Mixed, default: "unknown" },
    review_text: { type: String, required: true },
    text_hash: { type: String, required: true, unique: true, index: true },
    date: { type: String, default: "" },
    sentiment: { type: String, enum: ["positive", "neutral", "negative", "analysis_failed"], required: true },
    topics: { type: [String], default: ["other"] },
    summary: { type: String, required: true },
    needs_reply: { type: Boolean, default: false },
    rating_mismatch: { type: Boolean, default: false },
    suggested_reply: { type: String, default: "" },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
