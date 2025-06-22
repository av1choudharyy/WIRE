import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'headout-wire';

/**
 * Downloads a file from URL and uploads it to S3
 * @param {string} fileUrl - Original file URL
 * @param {string} bookingId - Booking ID for file naming
 * @param {string} fileType - 'audio' or 'image'
 * @param {Object} headers - Optional headers for downloading (e.g., authorization)
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
async function downloadAndUploadToS3(fileUrl, bookingId, fileType, headers = {}) {
  if (!fileUrl) {
    throw new Error("File URL is required");
  }
  if (!bookingId) {
    throw new Error("bookingId is required for safe file naming");
  }

  console.log(`Downloading and uploading ${fileType} for bookingId:`, bookingId);
  
  const tmp = os.tmpdir();
  const urlParts = fileUrl.split('/');
  let baseName = urlParts[urlParts.length - 1].split('?')[0]; // remove query params
  let ext = path.extname(baseName);
  
  // If no extension, infer from file type
  if (!ext) {
    ext = fileType === 'audio' ? '.opus' : '.jpg';
  }
  
  const safeBookingId = String(bookingId).replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '-').slice(0, 19);
  const localFileName = path.join(tmp, `${safeBookingId}_${timestamp}${ext}`);
  
  try {
    // Download file
    const writer = fs.createWriteStream(localFileName);
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
      headers: headers
    });
    
    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Generate S3 key
    const s3Key = `${fileType.toUpperCase()}-${timestamp}${ext}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fs.createReadStream(localFileName),
      ContentType: getContentType(ext, fileType)
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    
    // Clean up local file
    fs.unlinkSync(localFileName);
    
    console.log(`Successfully uploaded ${fileType} to S3:`, uploadResult.Location);
    return uploadResult.Location;
    
  } catch (error) {
    // Clean up local file if it exists
    if (fs.existsSync(localFileName)) {
      fs.unlinkSync(localFileName);
    }
    console.error(`Error uploading ${fileType} to S3:`, error);
    throw new Error(`Failed to upload ${fileType} to S3: ${error.message}`);
  }
}

/**
 * Uploads a local file to S3
 * @param {string} localFilePath - Path to local file
 * @param {string} bookingId - Booking ID for file naming
 * @param {string} fileType - 'audio' or 'image'
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
async function uploadLocalFileToS3(localFilePath, bookingId, fileType) {
  if (!fs.existsSync(localFilePath)) {
    throw new Error("Local file does not exist");
  }
  
  const ext = path.extname(localFilePath);
  const safeBookingId = String(bookingId).replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '-').slice(0, 19);
  const s3Key = `${fileType.toUpperCase()}-${timestamp}${ext}`;
  
  try {
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fs.createReadStream(localFilePath),
      ContentType: getContentType(ext, fileType)
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`Successfully uploaded local ${fileType} to S3:`, uploadResult.Location);
    return uploadResult.Location;
    
  } catch (error) {
    console.error(`Error uploading local ${fileType} to S3:`, error);
    throw new Error(`Failed to upload local ${fileType} to S3: ${error.message}`);
  }
}

/**
 * Get appropriate content type based on file extension and type
 */
function getContentType(ext, fileType) {
  const audioTypes = {
    '.opus': 'audio/opus',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };
  
  const imageTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  if (fileType === 'audio') {
    return audioTypes[ext.toLowerCase()] || 'audio/opus';
  } else if (fileType === 'image') {
    return imageTypes[ext.toLowerCase()] || 'image/jpeg';
  }
  
  return 'application/octet-stream';
}

export { downloadAndUploadToS3, uploadLocalFileToS3 };
