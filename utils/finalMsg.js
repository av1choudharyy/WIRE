import axios from 'axios';
import review from "../models/review.js"; // Adjust the import path as necessary

// === CONFIG ===
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Your WhatsApp Cloud API token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // Your WhatsApp Business phone number ID


const getTranscriptionByBookingId = async (bookingId) => {
  if (!bookingId) {
    throw new Error("Booking ID is required to fetch transcription");
  }

  try {
    const reviewData = await review.findOne({ bookingId: bookingId });
    if (!reviewData) {
      throw new Error(`No review found for booking ID: ${bookingId}`);
    }

    // Assuming the transcription is stored in the 'follow_up.answer' field
    const transcription = reviewData.processed_review || null;

    if (!transcription) {
      throw new Error(`No transcription available for booking ID: ${bookingId}`);
    }

    return transcription;
  } catch (error) {
    console.error("Error fetching transcription:", error.message);
    throw error; // Re-throw to handle it in the calling function
  }
};

/**
 * Sends thank you or follow-up question based on passed follow-up string.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} [followUp] - Optional follow-up question string.
 */
const sendThankYouOrFollowUp = async (phoneNumber, followUp = "") => {
  let messageText = '';

  if (!followUp || followUp.trim().length === 0) {
    const transcription = await getTranscriptionByBookingId(phoneNumber);
    if (!transcription) {
      console.error("No transcription available for the provided phone number.");
      return;
    }
    // Escape asterisks in transcription to prevent formatting conflicts
    const escapedTranscription = transcription.trim().replace(/\*\*\*/g, '* * *');
    messageText = `Thank you for your lovely review! Here is the transcription of it:\n\n*${escapedTranscription}*\n\nWe're so glad to have you with us & look forward to your next booking! 😊`;
  } else {
    messageText = `Thanks a ton for the review! 🙏 We had a quick read and it'd be super helpful if you could answer this too:\n\n🎤 "${followUp}"\n\nA quick audio message (30–60 sec) would be perfect! 🎧`;
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: !followUp || followUp.trim().length === 0 ? "interactive" : "text",
        ...((!followUp || followUp.trim().length === 0) ? {
          interactive: {
            type: "button",
            body: {
              text: messageText
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: "surprise_me",
                    title: "🎉 Surprise Me!"
                  }
                }
              ]
            }
          }
        } : {
          text: {
            body: messageText
          }
        })
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

export const sendSuggestions = async (phoneNumber) => {
  try {
    // First, send the image with suggestion
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "image",
        image: {
          link: "https://cdn-imgix.headout.com/media/images/8a617303332aad243277344b589696b1-7.jpg?w=3360&h=2100&crop=faces&auto=compress%2Cformat&fit=min",
          caption: 'Get 25% off on your next booking. Here is a suggestion \n*The Lion King Tickets*\n\n🎟️ *Click to book now:*\nhttps://www.headout.com/broadway-tickets/the-lion-king-e-507/'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "image",
        image: {
          link: "https://cdn-imgix.headout.com/media/images/e5c370149930d14831394d1c20750ff7-Broadway.jpg?w=630&h=630&crop=faces&auto=compress%2Cformat&fit=min",
          caption: 'Get 25% off on your next booking. Here are 43 experience that you can take in Broadway \n*Broadway Tickets*\n\n🎟️ *Click to book now:*\nhttps://www.headout.com/broadway-tickets-c-24/'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error('❌ Error sending suggestions via WhatsApp API:', error.response?.data || error.message);
  }
}

// === USAGE EXAMPLES ===

// Case 1: No follow-ups
// sendThankYouOrFollowUp('919643782690');

// Case 2: With follow-up
// sendThankYouOrFollowUp('919643782690', 'What did you love the most about the experience?');

export default sendThankYouOrFollowUp;
