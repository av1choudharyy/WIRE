# WIRE - Customer Review Analysis System

## S3 Integration Setup

This system now automatically uploads audio and image files to AWS S3 for persistent storage and uses the S3 URLs for processing and database storage.

### Prerequisites

1. **AWS Account**: You need an AWS account with S3 access
2. **S3 Bucket**: Create an S3 bucket with public read access
3. **AWS Credentials**: Set up AWS credentials for your application

### S3 Bucket Setup

1. Create an S3 bucket named `headout-wire` (or your preferred name)
2. Set the bucket policy for public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::headout-wire/*"
        }
    ]
}
```

3. Disable "Block all public access" if needed for public read access

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (default: us-east-1)
- `S3_BUCKET_NAME`: Your S3 bucket name (default: headout-wire)

### How It Works

1. **Audio Processing**:
   - Downloads audio file from WhatsApp/source URL
   - Uploads original audio to S3
   - Converts to OGG format for OpenAI Whisper
   - Transcribes audio using OpenAI
   - Stores S3 URL in MongoDB (not the original URL)

2. **Image Processing**:
   - Downloads image from source URL
   - Uploads to S3
   - Stores S3 URL in MongoDB

3. **File Naming Convention**:
   - Audio: `AUDIO-YYYY-MM-DD-HH-MM-SS.ext`
   - Images: `IMAGE-YYYY-MM-DD-HH-MM-SS.ext`

### API Endpoints

- `POST /processReview/:channel/:bookingId`: Process text/audio/image reviews
- `POST /waWebhook`: WhatsApp webhook for incoming messages
- `GET /getReviews`: Retrieve all stored reviews

### Sample S3 URLs

After processing, your files will be accessible at URLs like:
- `https://headout-wire.s3.us-east-1.amazonaws.com/AUDIO-2025-06-22-10-30-45.m4a`
- `https://headout-wire.s3.us-east-1.amazonaws.com/IMAGE-2025-06-22-10-30-46.jpg`

### Error Handling

- If S3 upload fails, the system falls back to storing the original URL
- Local temporary files are automatically cleaned up after processing
- All errors are logged for debugging

### Development

Run in development mode with auto-reload:
```bash
npm run dev
```

### Dependencies

- `aws-sdk`: For S3 integration
- `axios`: For HTTP requests and file downloads
- `openai`: For AI processing
- `mongoose`: For MongoDB integration
- `express`: Web framework
