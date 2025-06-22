import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    bookingId: String,
    channel: String, // 'ivr' or 'whatsapp'
    original_review: String,
    processed_review: String, // Gist of the review, cleaned up text
    language_detected: String, // Language code (e.g., "en", "es", "fr", "hi")
    translated_review: String, // English translation (if original is not English)
    rating: Number, // Rating extracted from text (3, 4, or 5)
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
    follow_ups: [
      {
        question: String,
        answer: String
      }
    ], // Store follow-up question/answer pairs
    media: [
      {
        type: { type: String, enum: ['image', 'audio'] },
        url: String,
        path: String // For MVP, store local file path
      }
    ],
    stats: {
      review_length: Number,
      keywords: [String],
      quality: Number, // Quality percentage based on cuss words analysis
      // Add more stats as needed
    },
    created_at: { type: Date, default: Date.now }
  });

export default mongoose.model("Review", reviewSchema);
