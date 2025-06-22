import mongoose from "mongoose";
import Review from "../models/review.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));



async function saveReview({ channel, original, processed, sentiment, bookingId = "", followUps = [], keywords = [], reviewLength = 0, quality = 0, media = [], languageDetected = "en", translatedReview = null, rating = null }) {
  // Check if a review with the same bookingId already exists
  const existingReview = await Review.findOne({ bookingId: bookingId });
  
  if (existingReview) {
    // Update existing review
    existingReview.channel = channel;
    existingReview.original_review = original || existingReview.original_review;
    existingReview.processed_review = processed || existingReview.processed_review;
    existingReview.language_detected = languageDetected || existingReview.language_detected;
    existingReview.translated_review = translatedReview || existingReview.translated_review;
    existingReview.rating = rating || existingReview.rating;
    existingReview.sentiment = sentiment || existingReview.sentiment;
    existingReview.follow_ups = followUps.length > 0 ? followUps : existingReview.follow_ups;
    existingReview.stats.review_length = reviewLength || existingReview.stats.review_length;
    existingReview.stats.keywords = keywords.length > 0 ? keywords : existingReview.stats.keywords;
    existingReview.stats.quality = quality || existingReview.stats.quality;
    
    // Merge media arrays (avoid duplicates)
    if (media.length > 0) {
      const existingUrls = existingReview.media.map(m => m.url);
      const newMedia = media.filter(m => !existingUrls.includes(m.url));
      existingReview.media = [...existingReview.media, ...newMedia];
    }
    console.log(existingReview);
    await existingReview.save();
    console.log("Updated existing review for bookingId:", bookingId);
  } else {
    // Create new review
    const review = new Review({
      bookingId: bookingId,
      channel,
      original_review: original,
      processed_review: processed,
      language_detected: languageDetected,
      translated_review: translatedReview,
      rating: rating,
      sentiment,
      follow_ups: followUps,
      media: media,
      stats: {
        review_length: reviewLength,
        keywords: keywords,
        quality: quality
      }
    });
    console.log(review);
    await review.save();
    console.log("Created new review for bookingId:", bookingId);
  }
}

export { saveReview };
