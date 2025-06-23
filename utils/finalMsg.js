import axios from 'axios';

// === CONFIG ===
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Your WhatsApp Cloud API token
const PHONE_NUMBER_ID = '716535084869795'; // Replace with your phone number ID

/**
 * Sends thank you or follow-up question based on passed follow-up string.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} [followUp] - Optional follow-up question string.
 */
const sendThankYouOrFollowUp = async (phoneNumber, followUp = "") => {
  let messageText = '';

  if (!followUp || followUp.trim().length === 0) {
    messageText = `Thank you for your lovely review! 🙌 We're so glad to have you with us & look forward to your next booking! 😊`;
  } else {
    messageText = `Thanks a ton for the review! 🙏 We had a quick read and it'd be super helpful if you could answer this too:\n\n🎤 "${followUp}"\n\nA quick audio message (30–60 sec) would be perfect! 🎧`;
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: messageText
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Final message sent via WhatsApp API:', response.data);
  } catch (error) {
    console.error('❌ Error sending final message via WhatsApp API:', error.response?.data || error.message);
  }
};

// === USAGE EXAMPLES ===

// Case 1: No follow-ups
// sendThankYouOrFollowUp('919643782690');

// Case 2: With follow-up
// sendThankYouOrFollowUp('919643782690', 'What did you love the most about the experience?');

export default sendThankYouOrFollowUp;
