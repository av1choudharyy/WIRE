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
    messageText = `Thank you for your lovely review! Here is the transcription of it:\n\n*${transcription.trim()}*\n\nWe're so glad to have you with us & look forward to your next booking! 😊`;
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
    if(!followUp || followUp.trim().length === 0) {
      await sendSuggestions(phoneNumber);
    }
    console.log('✅ Final message sent via WhatsApp API:', response.data);
  } catch (error) {
    console.error('❌ Error sending final message via WhatsApp API:', error.response?.data || error.message);
  }
};

const sendSuggestions = async (phoneNumber) => {
  /*
    send 3 images with url to click on
    here are some suggestions for you, book with us and get 10% off on your next booking!
  */
  const suggestions = [
    {
      type: "image",
      url: "https://cdn-imgix.headout.com/tour/2638/TOUR-IMAGE/2eaad7e0-d3eb-43a0-ab28-f30cb384907b-1866-dubai-burj-khalifa-at-the-top-tickets--level-124---125-03.jpeg?w=613.2&h=384.3&crop=faces&auto=compress,format&fit=min",
      caption: "Suggestion 1"
    }
  ];

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "image",
        image: {
          link: suggestions[0].url,
          caption: 'Get 10% off on your next booking. Here are some suggestions for you \n*Burj Khalifa At The Top Tickets: Levels 124 & 125*\n\n🎟️ *Click to book now:*\nhttps://www.headout.com/burj-khalifa-tickets/burj-khalifa-at-the-top-tickets-level-124-125-e-1866/'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Suggestions sent via WhatsApp API:', response.data);
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
