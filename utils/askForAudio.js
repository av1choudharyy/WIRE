import axios from 'axios';

// === CONFIG ===
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;


// === FUNCTION ===
const sendVoiceReviewRequest = async (phoneNumber) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: `Thanks a ton! 🙌\n\nMind sending a quick voice note for your review 🎤 (30–60 sec) about your experience? No typing needed 😄 — we'd truly appreciate it! 💜`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Voice review request sent via WhatsApp API:', response.data);
  } catch (error) {
    console.error('❌ Failed to send voice review request via WhatsApp API:', error.response?.data || error.message);
  }
};


// === CALL FUNCTION ===
export default sendVoiceReviewRequest;
