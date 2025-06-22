import dotenv from "dotenv";
dotenv.config();


import OpenAI from "openai";
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { downloadAndUploadToS3, uploadLocalFileToS3 } from './s3Service.js';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



async function handleReviewInput(inputText) {
  if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
    throw new Error('Review input text is empty or invalid');
  }

  console.log("Processing review input:", inputText);
  
  // Extract rating from text patterns like "⭐ 5 - Excellent", "5-", "4-", "3-"
  const ratingMatch = inputText.match(/.*?([3-5])\s*-/);
  
  // If input contains a rating pattern, don't process with AI
  if (ratingMatch) {
    const rating = parseInt(ratingMatch[1]);
    console.log("Detected rating input:", rating);
    
    return {
      original_review: inputText,
      sentiment: null,
      keywords: [],
      follow_ups: [],
      review_length: inputText.length,
      followUpNeeded: false,
      quality: 100, // Default quality for rating-only input
      language_detected: "en",
      translated_review: null,
      rating: rating
    };
  }
  
  const prompt = `Analyze the following review. The review can be in any language and cuss words can be in any language.
1. Detect the language of the review
2. If the review is not in English, translate it to English
3. Generate a statistic of how many percentage of cuss words are there (in any language)
4. Classify the sentiment as positive, negative, or neutral
5. Extract 1-2 important keywords from the original text
6. If the review is negative, suggest 2 follow-up questions to ask

Return as JSON with keys: 
- original_review: the original review text exactly as provided
- language_detected: the detected language code (e.g., "en", "es", "fr", "hi", etc.)
- translated_review: the English translation (only if original is not English, otherwise null)
- sentiment: positive/negative/neutral
- keywords: array of 1-2 keywords
- follow_ups: array of follow-up questions (if negative)
- cuss_words_percentage: percentage of cuss words`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: inputText },
    ],
  });
  const responseData = response.choices[0].message.content;
  const responseString = JSON.parse(responseData.replace(/```json|```/g, '').trim());

  console.log("OpenAI response:", responseString);

  let sentiment = "neutral", keywords = [], follow_ups = [], quality = 100 - (responseString.cuss_words_percentage || 0);
  let language_detected = "en", translated_review = null, original_review = inputText;
  let rating = null; // No rating extraction from regular reviews

  try {
    sentiment = responseString.sentiment;
    keywords = responseString.keywords || [];
    follow_ups = responseString.follow_ups || [];
    language_detected = responseString.language_detected || "en";
    translated_review = responseString.translated_review || null;
    original_review = responseString.original_review || inputText;
  } catch (e) {
    console.error("Error parsing OpenAI response:", e);
    // throw new Error("Failed to parse OpenAI response");
  }

  return {
    original_review,
    sentiment,
    keywords,
    follow_ups,
    review_length: inputText.length,
    followUpNeeded: sentiment === "negative",
    quality: quality || 0,
    language_detected,
    translated_review,
    rating
  };
}

async function transcribeAudioViaUrl(audioUrl, bookingId) {
    if (!audioUrl) {
        throw new Error("Audio URL is required for transcription");
    }
    if (!bookingId) {
        throw new Error("bookingId is required for safe file naming");
    }
    console.log("Transcribing audio for bookingId:", bookingId);
    
    const tmp = os.tmpdir();
    const urlParts = audioUrl.split('/');
    let baseName = urlParts[urlParts.length - 1].split('?')[0]; // remove query params
    let ext = path.extname(baseName) || '.opus'; // Default to opus for WhatsApp
    let safeBookingId = String(bookingId).replace(/[^a-zA-Z0-9-_]/g, '_');
    
    const originalFileName = path.join(tmp, `${safeBookingId}_original${ext}`);
    const convertedFileName = path.join(tmp, `${safeBookingId}.ogg`);
    
    let s3AudioUrl = null;
    
    try {
        // Download the audio file
        const writer = fs.createWriteStream(originalFileName);
        const authorization = 'Bearer ' + process.env.WATI_API_KEY; // Assuming you have an API key for WATI
        const response = await axios({
            url: audioUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'Authorization': authorization
            }
        });
        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Convert OPUS to OGG using FFmpeg for OpenAI processing (optimized for speed)
        let s3ConvertedAudioUrl = null;
        try {
            // Use faster conversion settings: lower quality but much faster
            await execAsync(`ffmpeg -i "${originalFileName}" -c:a libvorbis -q:a 4 -ac 1 -ar 16000 "${convertedFileName}"`);
            console.log("Audio converted successfully (optimized for speed)");
            
            // Upload only the converted audio to S3
            s3ConvertedAudioUrl = await uploadLocalFileToS3(convertedFileName, bookingId, 'audio');
            console.log("Converted audio uploaded to S3:", s3ConvertedAudioUrl);
        } catch (error) {
            console.error("FFmpeg conversion failed:", error);
            throw new Error("Audio conversion failed");
        }

        // Transcribe using OpenAI Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(convertedFileName),
            model: "whisper-1",
            response_format: "text"
        });
        
        console.log("Transcription result:", transcription);
        console.log("Transcription type:", typeof transcription);
        console.log("Transcription length:", transcription ? transcription.length : 0);
        
        // Clean up local files - discard original OPUS completely
        fs.unlinkSync(originalFileName);
        fs.unlinkSync(convertedFileName);
        
        return {
            transcription: transcription?.trim() || "",
            s3AudioUrl: s3ConvertedAudioUrl // Return only the converted file URL
        };
    } catch (error) {
        // Clean up local files if they exist
        if (fs.existsSync(originalFileName)) {
            fs.unlinkSync(originalFileName);
        }
        if (fs.existsSync(convertedFileName)) {
            fs.unlinkSync(convertedFileName);
        }
        throw error;
    }
}

async function uploadImageToS3(imageUrl, bookingId) {
    if (!imageUrl) {
        throw new Error("Image URL is required");
    }
    if (!bookingId) {
        throw new Error("bookingId is required for safe file naming");
    }
    
    console.log("Uploading image to S3 for bookingId:", bookingId);
    
    try {
        // Set headers for image download if needed
        const headers = {};
        if (process.env.WATI_API_KEY) {
            headers['Authorization'] = 'Bearer ' + process.env.WATI_API_KEY;
        }
        
        const s3ImageUrl = await downloadAndUploadToS3(imageUrl, bookingId, 'image', headers);
        console.log("Image uploaded to S3:", s3ImageUrl);
        return s3ImageUrl;
    } catch (error) {
        console.error("Error uploading image to S3:", error);
        throw new Error(`Failed to upload image to S3: ${error.message}`);
    }
}

export { handleReviewInput, transcribeAudioViaUrl, uploadImageToS3 };
