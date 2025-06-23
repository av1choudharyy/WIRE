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

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = '716535084869795';

const sendWhatsAppList = async (to) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          header: { type: "text", text: "Rate Your Booking" },
          body: { text: "How would you rate your booking?" },
          footer: { text: "Your feedback helps us improve 💛" },
          action: {
            button: "Select Rating",
            sections: [
              {
                title: "Ratings",
                rows: [
                  { id: "5", title: "⭐ 5 - Excellent" },
                  { id: "4", title: "⭐ 4 - Good" },
                  { id: "3", title: "⭐ 3 - Okay" },
                  { id: "2", title: "⭐ 2 - Poor" },
                  { id: "1", title: "⭐ 1 - Terrible" }
                ]
              }
            ]
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ WhatsApp list message sent:', response.data);
  } catch (error) {
    console.error('❌ Failed to send WhatsApp list message:', error.response?.data || error.message);
  }
};

export { sendWhatsAppList };


export default sendRatingPrompt;
