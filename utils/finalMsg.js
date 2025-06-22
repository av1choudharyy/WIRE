import axios from 'axios';

const WATI_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZmZjhiNi1lMzgyLTRhNDYtYmZjMi1lZmJlMmZhN2Q5MzUiLCJ1bmlxdWVfbmFtZSI6InNoaXZhbS5iaGFzaW5AaGVhZG91dC5jb20iLCJuYW1laWQiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiZW1haWwiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiYXV0aF90aW1lIjoiMDYvMjEvMjAyNSAwNzoyMDo1OSIsInRlbmFudF9pZCI6IjQ1ODMyOCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.TDK1BKQwppc9P6MMLluWGOQrOisdZCtDGcCmoEpld6Q';

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
      `https://live-mt-server.wati.io/458328/api/v1/sendSessionMessage/${phoneNumber}?messageText=${encodeURIComponent(messageText)}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${WATI_ACCESS_TOKEN}`,
          Accept: '*/*',
        },
      }
    );
    console.log('✅ Final message sent:', response.data);
  } catch (error) {
    console.error('❌ Error sending final message:', error.response?.data || error.message);
  }
};

// === USAGE EXAMPLES ===

// Case 1: No follow-ups
// sendThankYouOrFollowUp('919643782690');

// Case 2: With follow-up
// sendThankYouOrFollowUp('919643782690', 'What did you love the most about the experience?');

export default sendThankYouOrFollowUp;
