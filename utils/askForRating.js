import axios from 'axios';
// === CONFIG ===
const WATI_ACCESS_TOKEN = process.env.WATI_API_KEY;


const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const sendWhatsAppList = async (to) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          header: { type: "text", text: "Rate Your Booking" },
          body: { text: "How would you rate your booking?" },
          footer: { text: "Your feedback helps us improve 💜" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "5", title: "⭐ 5 - Excellent" } },
              { type: "reply", reply: { id: "4", title: "⭐ 4 - Good" } },
              { type: "reply", reply: { id: "<3", title: "Something else" } }
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

const sendWhatsAppListBelow4 = async (to) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          header: { type: "text", text: "Rate Your Booking" },
          body: { text: "We are really sorry that you feel this way?" },
          footer: { text: "Your feedback helps us improve 💜" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "3", title: "⭐ 3 - Okay" } },
              { type: "reply", reply: { id: "2", title: "⭐ 2 - Bad" } },
              { type: "reply", reply: { id: "1", title: "⭐ 1 - Terrible" } }
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

export { sendWhatsAppList, sendWhatsAppListBelow4 };
