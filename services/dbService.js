import mongoose from "mongoose";
import Review from "../models/review.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));



async function saveReview({ channel, original, processed, sentiment, bookingId = "", followUp = null, keywords = [], reviewLength = 0, quality = 0, media = [], languageDetected = "en", translatedReview = null, rating = null }) {
  if (!bookingId) {
    console.error("Missing bookingId in saveReview call");
    return;
  }

  // Check if a review with the same bookingId already exists
  const existingReview = await Review.findOne({ bookingId: bookingId });
  
  if (existingReview) {
    console.log(`Updating existing review for bookingId: ${bookingId}`);
    
    // Update existing review (only update non-null/undefined values)
    if (channel) existingReview.channel = channel;
    if (original) existingReview.original_review = original;
    if (processed) existingReview.processed_review = processed;
    if (languageDetected) existingReview.language_detected = languageDetected;
    if (translatedReview) existingReview.translated_review = translatedReview;
    if (rating !== null && rating !== undefined) existingReview.rating = rating;
    if (sentiment) existingReview.sentiment = sentiment;
    
    // If new content (text/audio transcription) is provided, append to follow_up field
    if (original && original.trim()) {
      const newFollowUpContent = `Follow-up: ${original.trim()}`;
      if (existingReview.follow_up) {
        console.log(`Appending to existing follow_up: "${existingReview.follow_up}"`);
        existingReview.follow_up += `\n${newFollowUpContent}`;
      } else {
        console.log("Adding first follow_up content");
        existingReview.follow_up = newFollowUpContent;
      }
      console.log(`Updated follow_up: "${existingReview.follow_up}"`);
    } else if (followUp) {
      // Only update follow_up if the new value is not null/undefined/empty
      existingReview.follow_up = followUp;
    }
    
    if (reviewLength > 0) {
      existingReview.stats.review_length = reviewLength;
    }
    if (keywords && keywords.length > 0) {
      existingReview.stats.keywords = keywords;
    }
    if (quality > 0) {
      existingReview.stats.quality = quality;
    }
    
    // Merge media arrays (avoid duplicates)
    if (media && media.length > 0) {
      const existingUrls = existingReview.media.map(m => m.url);
      const newMedia = media.filter(m => !existingUrls.includes(m.url));
      existingReview.media = [...existingReview.media, ...newMedia];
    }
    
    console.log("Review to save:", JSON.stringify(existingReview, null, 2));
    await existingReview.save();
    console.log("Updated existing review for bookingId:", bookingId);
  } else {
    console.log(`Creating new review for bookingId: ${bookingId}`);
    
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
      follow_up: followUp,
      media: media || [],
      stats: {
        review_length: reviewLength || 0,
        keywords: keywords || [],
        quality: quality || 0
      }
    });
    console.log(review);
    await review.save();
    console.log("Created new review for bookingId:", bookingId);
  }
}

export { saveReview };
