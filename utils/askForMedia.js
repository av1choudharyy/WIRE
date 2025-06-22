const axios = require('axios');

// === CONFIG ===
const WATI_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZmZjhiNi1lMzgyLTRhNDYtYmZjMi1lZmJlMmZhN2Q5MzUiLCJ1bmlxdWVfbmFtZSI6InNoaXZhbS5iaGFzaW5AaGVhZG91dC5jb20iLCJuYW1laWQiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiZW1haWwiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiYXV0aF90aW1lIjoiMDYvMjEvMjAyNSAwNzoyMDo1OSIsInRlbmFudF9pZCI6IjQ1ODMyOCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.TDK1BKQwppc9P6MMLluWGOQrOisdZCtDGcCmoEpld6Q';
const phoneNumber = '919643782690'; // Recipient's phone number

// === FUNCTION ===
const sendImageReviewRequest = async () => {
  try {
    const response = await axios.post(
      `https://live-mt-server.wati.io/458328/api/v1/sendSessionMessage/${phoneNumber}?messageText=${encodeURIComponent(
        `Would you like to add a photo to your review? 📸 We'd love to see it!\n\nIf not, just reply "end" to finish. 😊`
      )}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${WATI_ACCESS_TOKEN}`,
          Accept: '*/*',
        },
      }
    );

    console.log('✅ Image review request sent:', response.data);
  } catch (error) {
    console.error('❌ Failed to send image review request:', error.response?.data || error.message);
  }
};

// === RUN ===
sendImageReviewRequest();
