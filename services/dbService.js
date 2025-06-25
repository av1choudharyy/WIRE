import mongoose from "mongoose";
import Review from "../models/review.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"));



async function saveReview({ channel, original, processed, sentiment, bookingId = "", name = null, followUp = null, followUpAnswer = null, keywords = [], reviewLength = 0, quality = 0, media = [], languageDetected = "en", translatedReview = null, rating = null }) {
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
    if (name) existingReview.name = name;
    if (original) existingReview.original_review = original;
    if (processed) existingReview.processed_review = processed;
    if (languageDetected) existingReview.language_detected = languageDetected;
    if (translatedReview) existingReview.translated_review = translatedReview;
    if (rating !== null && rating !== undefined) existingReview.rating = rating;
    if (sentiment) existingReview.sentiment = sentiment;
    
    // Only update follow_up if a new one is provided from AI analysis
    if (followUp !== null && followUp !== undefined) {
      if (!existingReview.follow_up) {
        existingReview.follow_up = {};
      }
      existingReview.follow_up.question = followUp;
      console.log("Updated follow_up question from AI:", followUp);
    }
    
    // Update follow-up answer if provided
    if (followUpAnswer !== null && followUpAnswer !== undefined) {
      if (!existingReview.follow_up) {
        existingReview.follow_up = {};
      }
      existingReview.follow_up.answer = followUpAnswer;
      console.log("Updated follow_up answer from user:", followUpAnswer);
    }
    
    if (!followUp && !followUpAnswer && existingReview.follow_up) {
      console.log("No new follow_up provided, keeping existing:", existingReview.follow_up);
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
    
    // Handle media with isActive flag for audio
    if (media && media.length > 0) {
      const existingUrls = existingReview.media.map(m => m.url);
      const newMedia = media.filter(m => !existingUrls.includes(m.url));
      
      // If adding new audio, set previous audio to inactive and new audio to active
      for (const newMediaItem of newMedia) {
        if (newMediaItem.type === 'audio') {
          // Set all existing audio files to inactive
          existingReview.media.forEach(m => {
            if (m.type === 'audio') {
              m.isActive = false;
            }
          });
          // Set new audio to active
          newMediaItem.isActive = true;
        }
      }
      
      existingReview.media = [...existingReview.media, ...newMedia];
    }
    
    console.log("Review to save:", JSON.stringify(existingReview, null, 2));
    await existingReview.save();
    console.log("Updated existing review for bookingId:", bookingId);
  } else {
    console.log(`Creating new review for bookingId: ${bookingId}`);
    
    // Handle isActive flag for audio in new media
    if (media && media.length > 0) {
      media.forEach(mediaItem => {
        if (mediaItem.type === 'audio') {
          mediaItem.isActive = true; // First audio is always active
        }
      });
    }
    
    // Create new review
    const review = new Review({
      bookingId: bookingId,
      name: name,
      channel,
      original_review: original,
      processed_review: processed,
      language_detected: languageDetected,
      translated_review: translatedReview,
      rating: rating,
      sentiment,
      follow_up: followUp ? { question: followUp, answer: followUpAnswer || null } : null,
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

async function isFollowUpAnswer(bookingId) {
  try {
    const existingReview = await Review.findOne({ bookingId: bookingId });
    
    // Check if there's a follow-up question without an answer
    if (existingReview && 
        existingReview.follow_up && 
        existingReview.follow_up.question && 
        !existingReview.follow_up.answer) {
      console.log("Detected follow-up answer for bookingId:", bookingId);
      return true;
    }
    
    console.log("Not a follow-up answer for bookingId:", bookingId);
    return false;
  } catch (error) {
    console.error("Error checking follow-up status:", error);
    return false;
  }
}

export { saveReview, isFollowUpAnswer };
