import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    bookingId: String,
    name: String, // User's name from WhatsApp contact
    channel: String, // 'ivr' or 'whatsapp'
    original_review: String,
    processed_review: String, // Gist of the review, cleaned up text
    language_detected: String, // Language code (e.g., "en", "es", "fr", "hi")
    translated_review: String, // English translation (if original is not English)
    rating: Number, // Rating extracted from text (3, 4, or 5)
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
    follow_up: {
      question: String, // Follow-up question from AI
      answer: String    // User's answer to the follow-up question
    },
    media: [
      {
        type: { type: String, enum: ['image', 'audio'] },
        url: String,
        path: String, // For MVP, store local file path
        isActive: { type: Boolean, default: false } // For audio files, indicates the latest/active audio
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
