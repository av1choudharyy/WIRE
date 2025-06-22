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
      follow_up: null,
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
3. Replace ALL cuss words/profanity with *** (in any language) in both original text and translation
4. Generate a statistic of how many percentage of cuss words were there BEFORE replacement
5. Classify the sentiment as positive, negative, or neutral
6. Extract 1-2 important keywords from the cleaned text (after cuss word replacement)
7. If the review is negative, suggest 1 follow-up question to ask

Return as JSON with keys: 
- original_review: the original review text with cuss words replaced by ***
- language_detected: the detected language code (e.g., "en", "es", "fr", "hi", etc.)
- translated_review: the English translation with cuss words replaced by *** (only if original is not English, otherwise null)
- sentiment: positive/negative/neutral
- keywords: array of 1-2 keywords from cleaned text
- follow_up: single follow-up question string (if negative), otherwise null
- cuss_words_percentage: percentage of cuss words that were replaced`;

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
  console.log("Follow-up from OpenAI:", responseString.follow_up);
  console.log("Follow-up type:", typeof responseString.follow_up);

  let sentiment = "neutral", keywords = [], follow_up = null, quality = 100 - (responseString.cuss_words_percentage || 0);
  let language_detected = "en", translated_review = null, original_review = inputText;
  let rating = null; // No rating extraction from regular reviews

  try {
    sentiment = responseString.sentiment;
    keywords = responseString.keywords || [];
    
    // Handle single follow_up question as string
    follow_up = responseString.follow_up && typeof responseString.follow_up === 'string' 
      ? responseString.follow_up.trim() 
      : null;
    
    language_detected = responseString.language_detected || "en";
    translated_review = responseString.translated_review || null;
    original_review = responseString.original_review || inputText;
    
    console.log("Processed follow-up:", follow_up);
  } catch (e) {
    console.error("Error parsing OpenAI response:", e);
    // throw new Error("Failed to parse OpenAI response");
  }

  return {
    original_review,
    sentiment,
    keywords,
    follow_up,
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
        
        // Clean transcribed text by asking AI to replace cuss words
        const cleanTranscriptionPrompt = `Clean the following transcribed text by replacing any cuss words or profanity with *** (in any language). Return only the cleaned text, no other formatting or explanation.`;
        
        const cleanResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: cleanTranscriptionPrompt },
                { role: "user", content: transcription?.trim() || "" },
            ],
        });
        
        const cleanedTranscription = cleanResponse.choices[0].message.content.trim();
        console.log("AI-cleaned transcription:", cleanedTranscription);
        
        // Clean up local files - discard original OPUS completely
        fs.unlinkSync(originalFileName);
        fs.unlinkSync(convertedFileName);
        
        return {
            transcription: cleanedTranscription,
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
