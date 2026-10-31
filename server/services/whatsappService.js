// Logs messages in development. Set WHATSAPP_ENABLED=true to send through Meta's WhatsApp Cloud API.
// Note: Meta requires approved templates for business-initiated messages; adapt this call when you go live.
// Sends WhatsApp template messages through Meta's WhatsApp Cloud API.
// While WHATSAPP_ENABLED is not "true", messages are printed in the terminal instead.
const digits = (p) => {
  let d = String(p).replace(/\D/g, '');
  if (d.length === 10) d = (process.env.DEFAULT_COUNTRY_CODE || '91') + d;
  return d;
};

exports.sendTemplate = async (phone, template, params = [], { otp, fallback } = {}) => {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    console.log(`\n[WhatsApp -> ${phone}] (${template})\n${fallback || params.join(' | ')}\n`);
    return;
  }
  try {
    const components = [{ type: 'body', parameters: params.map((t) => ({ type: 'text', text: String(t) })) }];
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
    console.error('WhatsApp send failed:', e.message);
  }
};