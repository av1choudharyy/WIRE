import express from "express";
import { handleReviewInput, transcribeAudioViaUrl, uploadImageToS3 } from "../services/aiService.js";
import { saveReview } from "../services/dbService.js";
import review from "../models/review.js";
import sendRatingPrompt, { sendWhatsAppList } from "../utils/askForRating.js";
import sendVoiceReviewRequest from "../utils/askForAudio.js";
import sendImageReviewRequest from "../utils/askForMedia.js";
import sendThankYouOrFollowUp from "../utils/finalMsg.js";
const router = express.Router();


router.post('/startReviewSession', async (req, res) => {
    await sendWhatsAppList(req.body.phoneNumber);
    res.status(200).json({ message: "Review session started, rating prompt sent" });
});

router.post("/processReview/:channel/:bookingId", async (req, res) => {
    const { channel, bookingId } = req.params;
    const { reviewText, audioURL, mediaURLs = [] } = req.body;

    try {
        let processed_review = null;
        let sentiment = null;
        let keywords = [];
        let follow_up = null;
        let review_length = 0;
        let quality = null;
        let media = [];
        let original_review = reviewText || null;
        let language_detected = "en";
        let translated_review = null;

        if (reviewText) {
            const result = await handleReviewInput(reviewText);
            original_review = result.original_review;
            sentiment = result.sentiment;
            keywords = result.keywords;
            follow_up = result.follow_up;
            review_length = result.review_length;
            quality = result.quality;
            language_detected = result.language_detected;
            translated_review = result.translated_review;
            processed_review = reviewText;
        }

        if (audioURL) {
            const result = await transcribeAudioViaUrl(audioURL, bookingId);
            processed_review = result.transcription;
            // Use S3 URL instead of original URL
            media.push({ type: 'audio', url: result.s3AudioUrl });
            const analysisResult = await handleReviewInput(result.transcription);
            original_review = analysisResult.original_review;
            sentiment = analysisResult.sentiment;
            keywords = analysisResult.keywords;
            follow_up = analysisResult.follow_up;
            review_length = analysisResult.review_length;
            quality = analysisResult.quality;
            language_detected = analysisResult.language_detected;
            translated_review = analysisResult.translated_review;
        }

        if (mediaURLs && Array.isArray(mediaURLs)) {
            for (const url of mediaURLs) {
                try {
                    // Upload each image to S3 and store S3 URL
                    const s3ImageUrl = await uploadImageToS3(url, bookingId);
                    media.push({ type: 'image', url: s3ImageUrl });
                } catch (error) {
                    console.error("Error uploading image to S3:", error);
                    // Fallback to original URL if S3 upload fails
                    media.push({ type: 'image', url });
                }
            }
        }

        await saveReview({
            channel,
            bookingId,
            original: original_review,
            processed: processed_review,
            sentiment,
            followUp: follow_up,
            keywords,
            reviewLength: review_length,
            quality,
            media,
            languageDetected: language_detected,
            translatedReview: translated_review
        });

        res.status(200).json({ message: "Review processed and stored successfully" });
    } catch (error) {
        console.error("Error processing review:", error);
        res.status(500).json({ error: "Failed to process review" });
    }
});

router.get("/getReviews", async (req, res) => {

    try {
        const reviews = await review.find().sort({ created_at: -1 });
        res.status(200).json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

router.post("/waWebhook", async (req, res) => {
    const {body} = req;
    const { waId, text, type, data } = body;
    const bookingId = waId; // Assuming waId is the bookingId
    //assume opus file format
    try {
        if (type === 'audio' && data) {
            const result = await transcribeAudioViaUrl(data, bookingId);
            const transcription = result.transcription;
            const s3AudioUrl = result.s3AudioUrl;
            
            console.log("Audio transcription result:", transcription);
            
            // Check if transcription is valid before processing
            if (!transcription || typeof transcription !== 'string' || !transcription.trim()) {
                console.error("Empty or invalid transcription:", transcription);
                // Save audio without analysis if transcription failed
                await saveReview({
                    channel: 'whatsapp',
                    bookingId,
                    original: null,
                    processed: null,
                    sentiment: null,
                    followUp: null,
                    keywords: [],
                    reviewLength: 0,
                    quality: 0,
                    media: [{ type: 'audio', url: s3AudioUrl }],
                    languageDetected: "en",
                    translatedReview: null,
                    rating: null
                });
                return res.status(200).json({ message: "WhatsApp audio saved (transcription failed)" });
            }
            
            const analysisResult = await handleReviewInput(transcription);
            const original_review = analysisResult.original_review;
            const sentiment = analysisResult.sentiment;
            const keywords = analysisResult.keywords;
            const follow_up = analysisResult.follow_up;
            const review_length = analysisResult.review_length;
            const quality = analysisResult.quality;
            const language_detected = analysisResult.language_detected;
            const translated_review = analysisResult.translated_review;
            const rating = analysisResult.rating;
            
            await saveReview({
                channel: 'whatsapp',
                bookingId,
                original: original_review,
                processed: transcription,
                sentiment,
                followUp: follow_up,
                keywords,
                reviewLength: review_length,
                quality,
                media: [{ type: 'audio', url: s3AudioUrl }], // Use S3 URL
                languageDetected: language_detected,
                translatedReview: translated_review,
            });
            
            // Send image review request, then they'll get final message after image
            await sendImageReviewRequest(waId);

            res.status(200).json({ message: "WhatsApp audio processed and stored successfully" });
        }
        else if (text) {
            const result = await handleReviewInput(text);
            const original_review = result.original_review;
            const sentiment = result.sentiment;
            const keywords = result.keywords;
            const follow_up = result.follow_up;
            const review_length = result.review_length;
            const quality = result.quality;
            const language_detected = result.language_detected;
            const translated_review = result.translated_review;
            const rating = result.rating;

            if(rating){
                await sendVoiceReviewRequest(waId);
                await saveReview({
                    channel: 'whatsapp',
                    bookingId,
                    rating
                });
                res.status(200).json({ message: "WhatsApp text processed and rating prompt sent" });
                return;
            }

            await sendImageReviewRequest(waId); // Send image review request if needed
            console.log("WhatsApp text review processed:", {
                bookingId,
                original: original_review,
                processed: text,
                sentiment,
                follow_up,
                keywords,
                reviewLength: review_length,
                rating
            });
            await saveReview({
                channel: 'whatsapp',
                bookingId,
                original: original_review,
                processed: text,
                sentiment,
                followUp: follow_up,
                keywords,
                reviewLength: review_length,
                quality,
                media: [],
                languageDetected: language_detected,
                translatedReview: translated_review,
            });

            res.status(200).json({ message: "WhatsApp text processed and stored successfully" });
        } else if (type === 'image' && data) {
            // Upload image to S3 and store S3 URL
            try {
                const s3ImageUrl = await uploadImageToS3(data, bookingId);
                await saveReview({
                    channel: 'whatsapp',
                    bookingId,
                    media: [{ type: 'image', url: s3ImageUrl }] // Use S3 URL
                });
                
                // Get follow-up from DB and send final message
                const reviewData = await review.findOne({ bookingId });
                const followUpQuestion = reviewData && reviewData.follow_up ? reviewData.follow_up : "";
                console.log("Sending final message with follow-up:", followUpQuestion);
                await sendThankYouOrFollowUp(waId, followUpQuestion);
                
            } catch (error) {
                console.error("Error uploading image to S3:", error);
                // Fallback to original URL if S3 upload fails
                await saveReview({
                    channel: 'whatsapp',
                    bookingId,
                    original: null,
                    processed: null,
                    sentiment: null,
                    followUp: null,
                    keywords: [],
                    reviewLength: 0,
                    quality: 0,
                    media: [{ type: 'image', url: data }]
                });
                
                // Get follow-up from DB and send final message even on S3 failure
                const reviewData = await review.findOne({ bookingId });
                const followUpQuestion = reviewData && reviewData.follow_up ? reviewData.follow_up : "";
                console.log("Sending final message with follow-up (S3 fallback):", followUpQuestion);
                await sendThankYouOrFollowUp(waId, followUpQuestion);
            }

            res.status(200).json({ message: "WhatsApp image processed and stored successfully" });
        } else {
            console.error("Invalid WhatsApp message format:", body);
            res.status(400).json({ error: "Invalid WhatsApp message format" });
        }
    } catch (error) {
        console.error("Error processing WhatsApp webhook:", error);
        res.status(500).json({ error: "Failed to process WhatsApp webhook" });
    }
});

router.post('/test', async (req, res) => {
    const bookingId = req.body.bookingId;
    const result = await review.findOne({ bookingId });
    console.log(result);
    res.status(200).json({ message: "Test successful", data: result });
});

export default router;
