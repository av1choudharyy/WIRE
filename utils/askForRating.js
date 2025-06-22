import axios from 'axios';
// === CONFIG ===
const WATI_ACCESS_TOKEN = process.env.WATI_API_KEY;

// === FUNCTION ===
const sendRatingPrompt = async (phoneNumber) => {
  console.log('📞 Sending rating prompt to:', phoneNumber);
  try {
    const response = await axios.post(
      `https://live-mt-server.wati.io/458328/api/v1/sendInteractiveButtonsMessage?whatsappNumber=${phoneNumber}`,
      {
        buttons: [
          { text: '⭐ 5 - Excellent' },
          { text: '⭐ 4 - Good' },
          { text: '⭐ 3 - Okay' }
        ],
        body: `Hi there! 👋\nWe hope you enjoyed your recent Headout experience 🎟️\nWe’d love to hear how it went! How would you rate your booking?`,
        footer: 'Your feedback helps us improve 💛'
      },
      {
        headers: {
          Authorization: `Bearer ${WATI_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        }
      }
    );

    console.log('✅ Sent interactive rating message:', response.data);
  } catch (error) {
    console.error('❌ Failed to send interactive message:', error.response?.data || error.message);
  }
};

export default sendRatingPrompt;
