const axios = require('axios');

// === CONFIG ===
const WATI_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1NWZmZjhiNi1lMzgyLTRhNDYtYmZjMi1lZmJlMmZhN2Q5MzUiLCJ1bmlxdWVfbmFtZSI6InNoaXZhbS5iaGFzaW5AaGVhZG91dC5jb20iLCJuYW1laWQiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiZW1haWwiOiJzaGl2YW0uYmhhc2luQGhlYWRvdXQuY29tIiwiYXV0aF90aW1lIjoiMDYvMjEvMjAyNSAwNzoyMDo1OSIsInRlbmFudF9pZCI6IjQ1ODMyOCIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.TDK1BKQwppc9P6MMLluWGOQrOisdZCtDGcCmoEpld6Q';
const phoneNumber = '918294817554'; // Recipient's phone number with country code

// === FUNCTION ===
const sendVoiceReviewRequest = async () => {
    try {
      const response = await axios.post(
        `https://live-mt-server.wati.io/458328/api/v1/sendSessionMessage/${phoneNumber}?messageText=${encodeURIComponent(
          `Thanks a ton! 🙌
  
  Mind sending a quick voice note for your review 🎤 (30–60 sec) about your experience? No typing needed 😄 — we'd truly appreciate it! 💛`
        )}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${WATI_ACCESS_TOKEN}`,
            Accept: '*/*',
          }
        }
      );
  
      console.log('✅ Voice review request sent:', response.data);
    } catch (error) {
      console.error('❌ Failed to send voice review request:', error.response?.data || error.message);
    }
  };
  

// === CALL FUNCTION ===
sendVoiceReviewRequest();
