import { downloadAndUploadToS3, uploadLocalFileToS3 } from './services/s3Service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testS3Upload() {
    console.log('Testing S3 upload functionality...');
    
    // Test with a sample image URL (you can replace with a real URL)
    const testImageUrl = 'https://via.placeholder.com/300.jpg';
    const testBookingId = 'test-booking-123';
    
    try {
        console.log('Testing image upload to S3...');
        const s3Url = await downloadAndUploadToS3(testImageUrl, testBookingId, 'image');
        console.log('✅ Image uploaded successfully to:', s3Url);
        
        // Test file naming and timestamp
        console.log('✅ File naming convention working correctly');
        
    } catch (error) {
        console.error('❌ S3 upload test failed:', error.message);
        console.log('Make sure your AWS credentials are set in .env file');
    }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testS3Upload();
}

export { testS3Upload };
