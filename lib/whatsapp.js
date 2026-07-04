// lib/whatsapp.js
// Sends the "registration confirmed" WhatsApp message via Alpha
// Chatbox's approved template. This must never break registration
// itself — any failure here is logged and swallowed, not thrown.

const ALPHA_API_URL = 'https://alphachatbox.com/api/user/send-template-message';
const TEMPLATE_NAME = 'utility_qcc';
const TEMPLATE_ID = '1778183576508491';

async function sendRegistrationWhatsapp(mobile, name, qccId) {
  const apiKey = process.env.ALPHACHATBOX_API_KEY;
  if (!apiKey) {
    console.error('ALPHACHATBOX_API_KEY not set — skipping WhatsApp send');
    return;
  }

  // Indian mobile numbers need the country code prefixed with no '+'
  // or leading zero, per Alpha Chatbox's example ("917802854652").
  const recipient = `91${mobile}`;

  const payload = {
    campaign_name: '',
    recipients: [recipient],
    is_encrypted: false,
    is_campaign: true,
    template: {
      name: TEMPLATE_NAME,
      language: { code: 'en' },
      components: [
        {
          type: 'BODY',
          parameters: [
            { type: 'text', parameter_name: '1', text: name },
            { type: 'text', parameter_name: '2', text: qccId },
          ],
        },
      ],
    },
    template_id: TEMPLATE_ID,
  };

  try {
    const resp = await fetch(ALPHA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('WhatsApp send failed', resp.status, text);
    }
  } catch (err) {
    console.error('WhatsApp send error', err);
  }
}

module.exports = { sendRegistrationWhatsapp };
