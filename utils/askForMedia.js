import axios from 'axios';

// === CONFIG ===
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Your WhatsApp Cloud API token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // Your WhatsApp Business phone number ID

// === FUNCTION ===
const sendImageReviewRequest = async (phoneNumber) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: `Would you like to add a photo to your review? 📸 We'd love to see it!\n\nIf not, just reply "end" to finish. 😊`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Image review request sent via WhatsApp API:', response.data);
  } catch (error) {
    console.error('❌ Failed to send image review request via WhatsApp API:', error.response?.data || error.message);
  }
};

// === RUN ===
export default sendImageReviewRequest;
