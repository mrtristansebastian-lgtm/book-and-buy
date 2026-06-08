const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_BASE_URL = 'https://build-a-booking.web.app';

const cleanString = (value, max = 500) => (
  String(value || '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
);

const normalizeEmail = (value = '') => cleanString(value, 180).toLowerCase();

const escapeHtml = (value = '') => cleanString(value, 4000)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getSecretValue = (secret) => {
  try {
    return cleanString(secret?.value?.() || '');
  } catch {
    return '';
  }
};

const getEmailRuntimeConfig = ({ resendApiKeySecret } = {}) => {
  const apiKey = getSecretValue(resendApiKeySecret) || cleanString(process.env.RESEND_API_KEY || '', 500);
  const from = cleanString(process.env.BUILD_A_BOOKING_EMAIL_FROM || '', 240);
  const replyTo = cleanString(process.env.BUILD_A_BOOKING_EMAIL_REPLY_TO || '', 240);
  const baseUrl = cleanString(process.env.BUILD_A_BOOKING_APP_BASE_URL || DEFAULT_BASE_URL, 500).replace(/\/+$/, '');
  return {
    apiKey,
    from,
    replyTo,
    baseUrl,
    configured: Boolean(apiKey && from),
    missing: [
      apiKey ? '' : 'RESEND_API_KEY',
      from ? '' : 'BUILD_A_BOOKING_EMAIL_FROM'
    ].filter(Boolean)
  };
};

const getEmailProviderStatus = ({ resendApiKeySecret } = {}) => {
  const config = getEmailRuntimeConfig({ resendApiKeySecret });
  return {
    configured: config.configured,
    provider: 'resend',
    apiKey: config.apiKey ? 'configured' : 'missing',
    from: config.from ? 'configured' : 'missing',
    replyTo: config.replyTo ? 'configured' : 'optional',
    baseUrl: config.baseUrl,
    missing: config.missing
  };
};

const renderEmailLayout = ({
  eyebrow = 'Build A Booking',
  title,
  body,
  ctaLabel,
  ctaUrl,
  footer = 'This is an automated Build A Booking email.'
}) => {
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
  const button = ctaUrl
    ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;border-radius:999px;background:#050505;color:#ffffff;text-decoration:none;padding:14px 22px;font:700 12px Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(ctaLabel || 'Open')}</a>`
    : '';
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f8;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#050505;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #ebedf0;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 10px;">
          <p style="margin:0 0 14px;color:#9aa0a6;font:800 11px Arial,Helvetica,sans-serif;letter-spacing:.22em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0;color:#050505;font:800 30px/1.05 Arial,Helvetica,sans-serif;letter-spacing:-.02em;">${escapeHtml(title)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 26px;">
          <p style="margin:0;color:#555b63;font:500 15px/1.65 Arial,Helvetica,sans-serif;">${safeBody}</p>
        </td>
      </tr>
      ${button ? `<tr><td style="padding:0 32px 32px;">${button}</td></tr>` : ''}
      <tr>
        <td style="padding:20px 32px;background:#fbfbfc;border-top:1px solid #eef0f2;">
          <p style="margin:0;color:#9aa0a6;font:600 12px/1.5 Arial,Helvetica,sans-serif;">${escapeHtml(footer)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const sendEmail = async ({
  resendApiKeySecret,
  to,
  subject,
  html,
  text,
  replyTo
}) => {
  const config = getEmailRuntimeConfig({ resendApiKeySecret });
  const recipient = normalizeEmail(to);
  if (!recipient) return { ok: false, skipped: true, reason: 'Missing recipient email.' };
  if (!config.configured) {
    return {
      ok: false,
      skipped: true,
      reason: `Email provider not connected. Missing ${config.missing.join(', ')}.`
    };
  }

  const payload = {
    from: config.from,
    to: [recipient],
    subject: cleanString(subject, 220),
    html,
    text: cleanString(text, 4000)
  };
  const nextReplyTo = cleanString(replyTo || config.replyTo, 240);
  if (nextReplyTo) payload.reply_to = nextReplyTo;

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`Resend email failed with ${response.status}: ${responseBody.slice(0, 500)}`);
  }
  let parsed = null;
  try {
    parsed = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    parsed = null;
  }
  return { ok: true, provider: 'resend', id: parsed?.id || '' };
};

const buildVerificationEmail = ({ actionLink }) => {
  const body = 'Confirm your email address to unlock Build A Booking. This keeps your workspace, client portal, bookings, and messages connected to the right account.';
  return {
    subject: 'Verify your Build A Booking email',
    text: `${body}\n\nVerify email: ${actionLink}`,
    html: renderEmailLayout({
      eyebrow: 'Secure access',
      title: 'Verify your email.',
      body,
      ctaLabel: 'Verify email',
      ctaUrl: actionLink,
      footer: 'If you did not create a Build A Booking account, you can ignore this email.'
    })
  };
};

const buildPasswordResetEmail = ({ actionLink }) => {
  const body = 'Use this secure link to reset your Build A Booking password. If you did not request a reset, your account is still safe and no action is needed.';
  return {
    subject: 'Reset your Build A Booking password',
    text: `${body}\n\nReset password: ${actionLink}`,
    html: renderEmailLayout({
      eyebrow: 'Account recovery',
      title: 'Reset your password.',
      body,
      ctaLabel: 'Reset password',
      ctaUrl: actionLink,
      footer: 'This password reset link expires automatically.'
    })
  };
};

const defaultTemplateText = {
  bookingReceived: 'We received your booking request and will review it shortly. You can track updates in your client portal.',
  confirmed: 'Your booking request is confirmed. We look forward to seeing you.',
  declined: 'We could not approve that booking request. Open your portal to chat or request another time.',
  waitlist: 'You are on the waitlist. We will let you know if a spot opens.',
  runningLate: 'We are running a little behind. Thanks for your patience - we will keep you posted.',
  review: 'Thanks for visiting. We would love it if you could leave a quick review.',
  reminder24h: 'Your booking is tomorrow. Open your portal for details or to message the business.',
  reminder2h: 'Your booking is coming up soon. Open your portal if you need to message or reschedule.'
};

const defaultTemplateSubjects = {
  bookingReceived: 'Your booking request was sent',
  confirmed: 'Your booking was approved',
  declined: 'Booking request update',
  waitlist: 'Waitlist update',
  runningLate: 'Schedule update',
  review: 'Quick follow-up',
  reminder24h: 'Your booking is tomorrow',
  reminder2h: 'Your booking is coming up soon'
};

const getCommunicationTemplate = (communications = {}, templateKey) => {
  const template = communications?.[templateKey] || {};
  if (template.active === false) {
    return { active: false, text: '', subject: '' };
  }
  return {
    active: true,
    text: cleanString(template.text || defaultTemplateText[templateKey] || '', 2000),
    subject: cleanString(template.subject || defaultTemplateSubjects[templateKey] || 'Booking update', 220)
  };
};

const buildPortalUrl = ({ baseUrl, clientEmail }) => {
  const params = new URLSearchParams({ source: 'email' });
  if (clientEmail) params.set('email', clientEmail);
  return `${baseUrl}/#/client?${params.toString()}`;
};

const buildClientBookingEmail = ({
  booking = {},
  communications = {},
  settings = {},
  templateKey,
  extra = {},
  baseUrl
}) => {
  const template = getCommunicationTemplate(communications, templateKey);
  if (!template.active) return { skipped: true, reason: 'This email template is turned off.' };
  const workspaceName = settings.brandName || booking.workspaceName || 'The business';
  const clientName = booking.clientName || 'there';
  const appointment = [booking.date || booking.dateKey, booking.time].filter(Boolean).join(' at ');
  const detail = appointment ? `\n\nBooking: ${appointment}` : '';
  const service = booking.serviceName ? `\nService: ${booking.serviceName}` : '';
  const extraMessage = cleanString(extra.message || '', 1000);
  const minutes = cleanString(extra.minutes || '', 40);
  const body = [
    `Hi ${clientName},`,
    extraMessage || template.text,
    minutes && templateKey === 'runningLate' ? `Estimated delay: ${minutes} minutes.` : '',
    `${workspaceName}${detail}${service}`
  ].filter(Boolean).join('\n\n');
  const portalUrl = buildPortalUrl({ baseUrl, clientEmail: normalizeEmail(booking.clientEmail) });
  return {
    subject: `${workspaceName}: ${template.subject}`,
    text: `${body}\n\nOpen client portal: ${portalUrl}`,
    html: renderEmailLayout({
      eyebrow: workspaceName,
      title: template.subject,
      body,
      ctaLabel: 'Open portal',
      ctaUrl: portalUrl,
      footer: 'Use the same email you booked with to manage this booking automatically.'
    })
  };
};

const buildOwnerBookingRequestEmail = ({ booking = {}, ownerEmail, settings = {}, baseUrl }) => {
  const workspaceName = settings.brandName || booking.workspaceName || 'Build A Booking';
  const body = [
    `${booking.clientName || 'A client'} sent a booking request.`,
    booking.serviceName ? `Service: ${booking.serviceName}` : '',
    [booking.date || booking.dateKey, booking.time].filter(Boolean).join(' at '),
    booking.clientEmail ? `Client email: ${booking.clientEmail}` : '',
    booking.clientPhone ? `Client phone: ${booking.clientPhone}` : ''
  ].filter(Boolean).join('\n\n');
  const dashboardUrl = `${baseUrl}/#/dashboard/bookings`;
  return {
    to: ownerEmail,
    subject: `${workspaceName}: new booking request`,
    text: `${body}\n\nOpen bookings: ${dashboardUrl}`,
    html: renderEmailLayout({
      eyebrow: workspaceName,
      title: 'New booking request.',
      body,
      ctaLabel: 'Open bookings',
      ctaUrl: dashboardUrl,
      footer: 'The in-app notification and client portal records were also created.'
    })
  };
};

module.exports = {
  buildClientBookingEmail,
  buildOwnerBookingRequestEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  getEmailProviderStatus,
  getEmailRuntimeConfig,
  normalizeEmail,
  sendEmail
};
