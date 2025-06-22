const axios = require('axios');

// === CONFIG ===
const WATI_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZmZjhiNi1lMzgyLTRhNDYtYmZjMi1lZmJlMmZhN2Q5MzUiLCJ1bmlxdWVfbmFtZSI6InNoaXZhbS5iaGFzaW5AaGVhZG91dC5jb20iLCJuYW1laWQiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiZW1haWwiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiYXV0aF90aW1lIjoiMDYvMjEvMjAyNSAwNzoyMDo1OSIsInRlbmFudF9pZCI6IjQ1ODMyOCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.TDK1BKQwppc9P6MMLluWGOQrOisdZCtDGcCmoEpld6Q';
const phoneNumber = '918294817554';

// === FUNCTION ===
const sendRatingPrompt = async () => {
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

sendRatingPrompt();
