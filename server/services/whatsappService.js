// Sends WhatsApp template messages through Meta's WhatsApp Cloud API.
// While WHATSAPP_ENABLED is not "true", messages are printed in the terminal instead.
const digits = (p) => {
  let d = String(p).replace(/\D/g, '');
  if (d.length === 10) d = (process.env.DEFAULT_COUNTRY_CODE || '91') + d; // 10-digit number -> add country code
  return d;
};

exports.sendTemplate = async (phone, template, params = [], { otp, fallback } = {}) => {
  if (!phone || process.env.WHATSAPP_ENABLED !== 'true') {
    console.log(`\n[WhatsApp -> ${phone || 'no phone on file'}] (${template})\n${fallback || params.join(' | ')}\n`);
    return;
  }
  try {
    const components = [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t) })) }];
    // Authentication (OTP) templates also need the code in the copy-code button
    if (otp) components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(otp) }] });

    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits(phone),
        type: 'template',
        template: { name: template, language: { code: 'en' }, components }
      })
    });
    if (!res.ok) console.error(`WhatsApp (${template}) failed:`, await res.text());
  } catch (e) {
    console.error('WhatsApp send failed:', e.message); // a message failure must never block an order
  }
};