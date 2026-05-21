const OWNER_EMAIL = process.env.LANDSCAPER_OWNER_EMAIL || 'hello@verdantworks.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Verdant Works <onboarding@resend.dev>';

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return response.status(500).json({ error: 'Email service is not configured yet.' });
  }

  const lead = request.body || {};
  const subject = `New landscaping lead - ${lead.name || 'Website visitor'}`;
  const summary = lead.summary || 'No summary provided.';

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [OWNER_EMAIL],
      reply_to: lead.email,
      subject,
      text: summary
    })
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    console.error('Resend error:', errorBody);
    return response.status(502).json({ error: 'Could not send lead email.' });
  }

  return response.status(200).json({ ok: true });
};
