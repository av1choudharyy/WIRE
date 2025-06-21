import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import "./services/dbService.js"; // MongoDB init
import review from "./models/review.js";
import { sendWhatsAppList, sendWhatsAppListBelow4 } from "./utils/askForRating.js";
import { saveReview, isFollowUpAnswer } from "./services/dbService.js";
import sendVoiceReviewRequest from "./utils/askForAudio.js";
import { handleReviewInput } from "./services/aiService.js";
import { uploadLocalFileToS3 } from "./services/s3Service.js";
import OpenAI from "openai";
import sendImageReviewRequest from "./utils/askForMedia.js";
import sendThankYouOrFollowUp from "./utils/finalMsg.js";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Function to download and process WhatsApp image
async function processWhatsAppImage(mediaId, bookingId) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const tmp = os.tmpdir();
  const safeBookingId = String(bookingId).replace(/[^a-zA-Z0-9-_]/g, '_');
  
  try {
    // Step 1: Get media URL from WhatsApp
    console.log(`Getting media URL for image mediaId: ${mediaId}`);
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
      }
    );
    
    const mediaUrl = mediaResponse.data.url;
    const mimeType = mediaResponse.data.mime_type;
    console.log(`Image URL obtained: ${mediaUrl}, mime type: ${mimeType}`);
    
    // Determine file extension from mime type
    let fileExtension = '.jpg'; // default
    if (mimeType.includes('png')) fileExtension = '.png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) fileExtension = '.jpg';
    else if (mimeType.includes('webp')) fileExtension = '.webp';
    
    const imageFileName = path.join(tmp, `${safeBookingId}_whatsapp_image${fileExtension}`);
    
    // Step 2: Download the image file
    console.log(`Downloading image file for bookingId: ${bookingId}`);
    const imageResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      responseType: 'stream'
    });
    
    // Save to local file
    const writer = fs.createWriteStream(imageFileName);
    imageResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log(`Image file downloaded: ${imageFileName}`);
    
    // Step 3: Upload to S3
    const s3ImageUrl = await uploadLocalFileToS3(imageFileName, bookingId, 'image');
    console.log(`Image uploaded to S3: ${s3ImageUrl}`);
    
    // Clean up local file
    fs.unlinkSync(imageFileName);
    
    return {
      s3ImageUrl
    };
    
  } catch (error) {
    console.error("Error processing WhatsApp image:", error);
    throw error;
  }
}

// Function to download and process WhatsApp audio
async function processWhatsAppAudio(mediaId, bookingId) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const tmp = os.tmpdir();
  const safeBookingId = String(bookingId).replace(/[^a-zA-Z0-9-_]/g, '_');
  const audioFileName = path.join(tmp, `${safeBookingId}_whatsapp_audio.ogg`);
  
  try {
    // Step 1: Get media URL from WhatsApp
    console.log(`Getting media URL for mediaId: ${mediaId}`);
    const mediaResponse = await axios.get(
      `https://graph.facebook.com/v22.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
      }
    );
    
    const mediaUrl = mediaResponse.data.url;
    console.log(`Media URL obtained: ${mediaUrl}`);
    
    // Step 2: Download the audio file
    console.log(`Downloading audio file for bookingId: ${bookingId}`);
    const audioResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      responseType: 'stream'
    });
    
    // Save to local file
    const writer = fs.createWriteStream(audioFileName);
    audioResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log(`Audio file downloaded: ${audioFileName}`);
    
    // Step 3: Upload to S3
    const s3AudioUrl = await uploadLocalFileToS3(audioFileName, bookingId, 'audio');
    console.log(`Audio uploaded to S3: ${s3AudioUrl}`);
    
    // Step 4: Transcribe using OpenAI Whisper
    console.log("Starting transcription with OpenAI Whisper...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFileName),
      model: "whisper-1",
      response_format: "text"
    });
    
    console.log("Transcription completed:", transcription);
    
    // Clean up local file
    fs.unlinkSync(audioFileName);
    
    return {
      transcription: transcription,
      s3AudioUrl
    };
    
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(audioFileName)) {
      fs.unlinkSync(audioFileName);
    }
    console.error("Error processing WhatsApp audio:", error);
    throw error;
  }
}

// Facebook/WhatsApp webhook verification route
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'wire';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];


  console.log('Webhook verification request:', { mode, token, challenge });

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge); // Return hub.challenge
    } else {
      res.sendStatus(403); // Forbidden if token doesn't match
    }
  } else {
    // Handle case when mode or token is not provided
    res.sendStatus(400); // Bad Request
  }
});

app.post('/webhook', async (req, res) => {
  console.log('Received webhook POST request:', JSON.stringify(req.body, null, 2));
  
  if(req.body.entry && req.body.entry[0] && req.body.entry[0].changes && req.body.entry[0].changes[0] &&  req.body.entry[0].changes[0].value && req.body.entry[0].changes[0].value.messages) {
    const messages = req.body.entry[0].changes[0].value.messages;
    if (!messages || messages.length === 0) {
      console.error("No messages found in the webhook entry");
      return res.status(200).send('EVENT_RECEIVED');
    }
    
    const message = messages[0];
    const waId = message.from;
    const bookingId = waId; // Assuming waId is the bookingId
    
    try {
      // Handle rating selection from buttons
      if (message.interactive && message.interactive.button_reply) {
        const rating = message.interactive.button_reply.id;
        console.log("Received WhatsApp rating:", { waId, rating });
        
        if (rating === "<3") {
          // Send the below 4 rating options
          await sendWhatsAppListBelow4(waId);
        } else {
          // Store the rating and send voice request
          await sendVoiceReviewRequest(waId);
          await saveReview({
            channel: 'whatsapp',
            bookingId,
            rating: rating ? parseInt(rating) : null
          });
        }
        return res.status(200).send('EVENT_RECEIVED');
      }
      
      // Handle audio message
      if (message.type === 'audio' && message.audio) {
        console.log("Received WhatsApp audio message:", { waId, audioId: message.audio.id });
        
        // Check if this is a follow-up answer at the very start
        const isFollowUp = await isFollowUpAnswer(bookingId);
        
        const result = await processWhatsAppAudio(message.audio.id, bookingId);
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
          return res.status(200).send('EVENT_RECEIVED');
        }
        
        if (isFollowUp) {
          // This is a follow-up answer, save it as such
          await saveReview({
            channel: 'whatsapp',
            bookingId,
            followUpAnswer: transcription,
            media: [{ type: 'audio', url: s3AudioUrl }]
          });
          
          console.log("WhatsApp follow-up audio answer processed and stored successfully");

          await sendThankYouOrFollowUp(waId);
          return res.status(200).send('EVENT_RECEIVED');
        } else {
          // This is a new review, process with AI
          const analysisResult = await handleReviewInput(transcription);
          const original_review = analysisResult.original_review;
          const sentiment = analysisResult.sentiment;
          const keywords = analysisResult.keywords;
          const follow_up = analysisResult.follow_up;
          const review_length = analysisResult.review_length;
          const quality = analysisResult.quality;
          const language_detected = analysisResult.language_detected;
          const translated_review = analysisResult.translated_review;
          
          await saveReview({
            channel: 'whatsapp',
            bookingId,
            original: transcription,
            processed: original_review,
            sentiment,
            followUp: follow_up,
            keywords,
            reviewLength: review_length,
            quality,
            media: [{ type: 'audio', url: s3AudioUrl }],
            languageDetected: language_detected,
            translatedReview: translated_review,
          });
          await sendImageReviewRequest(waId);
          
          console.log("WhatsApp audio review processed and stored successfully");
        }
        
        return res.status(200).send('EVENT_RECEIVED');
      }
      
      // Handle text message
      if (message.type === 'text' && message.text) {
        console.log("Received WhatsApp text message:", { waId, text: message.text.body });
        
        // Check if this is a follow-up answer at the very start
        const isFollowUp = await isFollowUpAnswer(bookingId);
        
        if (isFollowUp) {
          // This is a follow-up answer, save it as such
          await saveReview({
            channel: 'whatsapp',
            bookingId,
            followUpAnswer: message.text.body
          });
          
          console.log("WhatsApp follow-up text answer processed and stored successfully");
          return res.status(200).send('EVENT_RECEIVED');
        }
        
        // This is a new review or rating, process with AI
        const result = await handleReviewInput(message.text.body);
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
          return res.status(200).send('EVENT_RECEIVED');
        }

        // Send image review request for regular text reviews
        await sendImageReviewRequest(waId);

        await saveReview({
          channel: 'whatsapp',
          bookingId,
          original: original_review,
          processed: message.text.body,
          sentiment,
          followUp: follow_up,
          keywords,
          reviewLength: review_length,
          quality,
          media: [],
          languageDetected: language_detected,
          translatedReview: translated_review,
        });

        console.log("WhatsApp text processed and stored successfully");
        return res.status(200).send('EVENT_RECEIVED');
      }
      
      // Handle image message
      if (message.type === 'image' && message.image) {
        const reviewData = await review.findOne({ bookingId });
        const followUpQuestion = reviewData && reviewData.follow_up && reviewData.follow_up.question ? reviewData.follow_up.question : "";
        console.log("Received WhatsApp image message:", { waId, imageId: message.image.id });
        await sendThankYouOrFollowUp(waId, followUpQuestion);
        try {
          const result = await processWhatsAppImage(message.image.id, bookingId);
          const s3ImageUrl = result.s3ImageUrl;
          
          await saveReview({
            channel: 'whatsapp',
            bookingId,
            media: [{ type: 'image', url: s3ImageUrl }]
          });
          
          // Get follow-up from DB and send final message
          console.log("Sending final message with follow-up:", followUpQuestion);
          console.log("WhatsApp image processed and stored successfully");
          return res.status(200).send('EVENT_RECEIVED');
          
        } catch (error) {
          console.error("Error processing WhatsApp image:", error);
          return res.status(200).send('EVENT_RECEIVED'); // Still acknowledge to prevent retries
        }
      }
      
    } catch (error) {
      console.error("Error processing WhatsApp message:", error);
      return res.status(200).send('EVENT_RECEIVED'); // Still acknowledge to prevent retries
    }
  }
  
  res.status(200).send('EVENT_RECEIVED'); // Acknowledge receipt of the webhook
});

app.post('/startReviewSession', async (req, res) => {
    await sendWhatsAppList(req.body.phoneNumber);
    res.status(200).json({ message: "Review session started, rating prompt sent" });
});

app.get('/reviews' , async (req, res) => {
  console.log(req);
  try {
    const reviews = await review.find({});
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Use the webhook router for POST requests
// app.use("/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}: http://localhost:${PORT}`));
