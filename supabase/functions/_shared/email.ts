// Booking emails sent through Resend (https://resend.com).

export interface MailBooking {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  amount: number | null;
  currency: string | null;
  payment_reference: string | null;
  hold_expires_at: string | null;
  meet_link: string | null;
  notes: string | null;
  service_name: string;
}

const SITE = (Deno.env.get('SITE_URL') || 'https://sthenofy.com').replace(/\/$/, '');
const PAY_LINK = Deno.env.get('PAYU_PAYMENT_LINK') || 'https://u.payu.in/8rW2Lhb18XZD';
const GOLD = '#FFCC00';

export const adminEmail = () => Deno.env.get('ADMIN_EMAIL') || 'support@sthenofy.com';
export const emailConfigured = () => Boolean(Deno.env.get('RESEND_API_KEY'));

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** "Tuesday, 3 November 2026" in India time, independent of locale comma rules. */
export function formatDay(iso: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

export function formatWhen(startsAt: string, endsAt: string): string {
  const time = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  return `${formatDay(startsAt)}, ${time(startsAt)} – ${time(endsAt)} (IST)`;
}

const formatTime = (iso: string) => `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))} IST`;
const money = (b: MailBooking) => b.amount == null ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: b.currency || 'INR', maximumFractionDigits: 0 }).format(Number(b.amount));
const ref = (b: MailBooking) => b.id.slice(0, 8).toUpperCase();

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#171717">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#000;padding:20px 28px;color:#fff;font-size:20px;font-weight:800;letter-spacing:2px">STHENOFY</td></tr>
<tr><td style="height:4px;background:${GOLD}"></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#fafafa;color:#737373;font-size:12px">STHENOFY · <a href="${SITE}" style="color:#737373">${SITE.replace('https://', '')}</a> · Questions? Reply to this email or WhatsApp +91 90356 54943.</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (label: string, value: string) => value
  ? `<tr><td style="padding:6px 0;color:#737373;width:130px;vertical-align:top">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`
  : '';
const details = (b: MailBooking, extra = '') => `<table cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 20px;font-size:14px">
${row('Service', escapeHtml(b.service_name))}${row('When', escapeHtml(formatWhen(b.starts_at, b.ends_at)))}${row('Amount', money(b))}${row('Reference', ref(b))}${extra}</table>`;
const button = (href: string, label: string) => `<a href="${href}" style="display:inline-block;background:${GOLD};color:#000;font-weight:800;text-decoration:none;padding:12px 22px;border-radius:4px;text-transform:uppercase;font-size:13px;letter-spacing:1px">${escapeHtml(label)}</a>`;
const p = (text: string) => `<p style="font-size:14px;line-height:1.6;margin:0 0 14px">${text}</p>`;

function calendarLinks(b: MailBooking): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = `STHENOFY: ${b.service_name}`;
  const where = b.meet_link || 'Online';
  const google = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(b.starts_at)}/${stamp(b.ends_at)}`, details: `Booking reference ${ref(b)}`, location: where })}`;
  const outlook = `https://outlook.office.com/calendar/0/deeplink/compose?${new URLSearchParams({ subject: title, startdt: b.starts_at, enddt: b.ends_at, body: `Booking reference ${ref(b)}`, location: where })}`;
  return p(`Add to your calendar: <a href="${google}">Google Calendar</a> · <a href="${outlook}">Outlook</a> · or open the attached <b>.ics</b> file (Apple Calendar, Outlook desktop).`);
}

export function icsFile(b: MailBooking): { filename: string; content: string } {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//STHENOFY//Bookings//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${b.id}@sthenofy.com`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(b.starts_at)}`, `DTEND:${stamp(b.ends_at)}`,
    `SUMMARY:${esc(`STHENOFY: ${b.service_name}`)}`, `DESCRIPTION:${esc(`Booking reference ${ref(b)}${b.meet_link ? `\nJoin: ${b.meet_link}` : ''}`)}`,
    `LOCATION:${esc(b.meet_link || 'Online')}`, 'END:VEVENT', 'END:VCALENDAR',
  ];
  return { filename: 'sthenofy-session.ics', content: btoa(lines.join('\r\n')) };
}

const meetBlock = (b: MailBooking) => b.meet_link
  ? p(`Join on Google Meet: <a href="${b.meet_link}"><b>${b.meet_link}</b></a>`) + `<div style="margin:0 0 18px">${button(b.meet_link, 'Join Google Meet')}</div>`
  : p('Your coach will share the session link before the appointment.');

export interface Email { to: string; subject: string; html: string; attachments?: { filename: string; content: string }[]; replyTo?: string }

// --- Customer emails ---
export const reservedEmail = (b: MailBooking): Email => ({
  to: b.customer_email!, subject: `Slot reserved: ${b.service_name} — complete your payment`,
  html: layout('Your slot is reserved', p(`Hi ${escapeHtml(b.customer_name)}, we're holding this slot for you while you pay.`) + details(b, row('Held until', b.hold_expires_at ? formatTime(b.hold_expires_at) : ''))
    + p(`<b>1.</b> Pay <b>${money(b)}</b> on PayU using the same email and phone.<br><b>2.</b> Go back to the booking page and enter your PayU transaction ID.<br><b>3.</b> We verify the payment and email your confirmation.`)
    + `<div style="margin:0 0 18px">${button(PAY_LINK, 'Pay now')}</div>` + p('<span style="color:#737373">Unpaid reservations are released automatically.</span>')),
});

export const confirmedEmail = (b: MailBooking): Email => ({
  to: b.customer_email!, subject: `Confirmed: ${b.service_name} on ${formatDay(b.starts_at)}`,
  html: layout('Your session is confirmed', p(`Hi ${escapeHtml(b.customer_name)}, you're all set. See you soon!`) + details(b) + meetBlock(b) + calendarLinks(b)),
  attachments: [icsFile(b)],
});

export const rescheduledEmail = (b: MailBooking, previousStartsAt: string | null): Email => ({
  to: b.customer_email!, subject: `Rescheduled: ${b.service_name} — new time`,
  html: layout('Your session has a new time', p(`Hi ${escapeHtml(b.customer_name)}, your session has been moved.`)
    + details(b, previousStartsAt ? row('Previously', `<s>${escapeHtml(formatWhen(previousStartsAt, new Date(new Date(previousStartsAt).getTime() + (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime())).toISOString()))}</s>`) : '')
    + meetBlock(b) + calendarLinks(b)),
  attachments: [icsFile(b)],
});

export const cancelledEmail = (b: MailBooking, wasConfirmed: boolean): Email => ({
  to: b.customer_email!, subject: `Cancelled: ${b.service_name} on ${formatDay(b.starts_at)}`,
  html: layout(wasConfirmed ? 'Your session was cancelled' : 'Your reservation was cancelled', p(`Hi ${escapeHtml(b.customer_name)}, the booking below has been cancelled.`) + details(b)
    + p(`If you have already paid, we will contact you about a refund as per our <a href="${SITE}/refund/">Refund Policy</a>. To book another time, visit <a href="${SITE}/services/">${SITE.replace('https://', '')}/services</a>.`)),
});

export const reminderEmail = (b: MailBooking, kind: '24h' | '1h'): Email => ({
  to: b.customer_email!, subject: kind === '24h' ? `Reminder: ${b.service_name} tomorrow` : `Starting in 1 hour: ${b.service_name}`,
  html: layout(kind === '24h' ? 'Your session is coming up' : 'Your session starts in 1 hour', p(`Hi ${escapeHtml(b.customer_name)}, a quick reminder about your session.`) + details(b) + meetBlock(b)
    + p('Need to change the time? Reply to this email or message us on WhatsApp.')),
});

// --- Admin emails ---
const adminLink = () => `<div style="margin:6px 0 18px">${button(`${SITE}/admin`, 'Open admin dashboard')}</div>`;
const customerRows = (b: MailBooking) => row('Customer', escapeHtml(b.customer_name)) + row('Email', escapeHtml(b.customer_email || '')) + row('Phone', escapeHtml(b.customer_phone || '')) + row('Notes', escapeHtml(b.notes || ''));

export const adminReservedEmail = (b: MailBooking): Email => ({
  to: adminEmail(), replyTo: b.customer_email || undefined, subject: `New reservation: ${b.customer_name} · ${formatWhen(b.starts_at, b.ends_at)}`,
  html: layout('New reservation (awaiting payment)', details(b, customerRows(b)) + p('The customer has been sent the PayU link. You will get another email when they submit a payment reference.') + adminLink()),
});

export const adminPaymentEmail = (b: MailBooking): Email => ({
  to: adminEmail(), replyTo: b.customer_email || undefined, subject: `Payment to verify: ${b.customer_name} · ${money(b)} · ref ${b.payment_reference || '—'}`,
  html: layout('Payment reference submitted', details(b, row('PayU ref', `<span style="font-family:monospace">${escapeHtml(b.payment_reference || '')}</span>`) + customerRows(b))
    + p(`Check this transaction in the PayU dashboard (amount <b>${money(b)}</b>), then click <b>Confirm payment</b> in the admin dashboard. The customer is emailed their confirmation automatically.`) + adminLink()),
});

export async function sendEmail(email: Email): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') || 'STHENOFY <bookings@sthenofy.com>',
      to: [email.to],
      reply_to: email.replyTo || adminEmail(),
      subject: email.subject,
      html: email.html,
      attachments: email.attachments,
    }),
  });
  if (!response.ok) throw new Error(`Email to ${email.to} failed: ${response.status} ${await response.text()}`);
}
