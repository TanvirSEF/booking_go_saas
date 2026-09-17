import nodemailer from 'nodemailer';
import { getGoogleCalendarUrl, getOutlookCalendarUrl } from './calendar-link';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface MailerResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

/**
 * Creates and caches the Nodemailer transporter singleton.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;

  if (!host || !user) {
    return null; // Signals mock/development fallback
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Core function to send an email with graceful mock fallback.
 */
export async function sendEmail(options: SendEmailOptions): Promise<MailerResult> {
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL || 'no-reply@bookinggo.saas';
  const defaultFromName = process.env.SMTP_FROM_NAME || 'BookingGo Notifications';

  const from = `"${options.fromName || defaultFromName}" <${options.fromEmail || defaultFromEmail}>`;
  const transporter = getTransporter();

  // If SMTP is not configured, log to console gracefully without throwing error
  if (!transporter) {
    console.log('\n📧 ==================== [MAILER MOCK SIMULATION] ====================');
    console.log(`From:    ${from}`);
    console.log(`To:      ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('--- Content Preview ---');
    console.log(options.text || options.html.replace(/<[^>]+>/g, ' ').substring(0, 300) + '...');
    console.log('====================================================================\n');

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}`,
      mocked: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      success: true,
      messageId: info.messageId,
      mocked: false,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown mailer error';
    console.error('❌ Failed to dispatch email via SMTP:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// ----------------------------------------------------------------------
// Reusable HTML Template Builders
// ----------------------------------------------------------------------

function wrapInEmailTemplate(contentHtml: string, businessName = 'BookingGo'): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .content { padding: 32px; }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .table-details { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table-details td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .table-details td.label { color: #64748b; font-weight: 500; width: 40%; }
    .table-details td.value { color: #0f172a; font-weight: 600; text-align: right; }
    .button-group { margin: 24px 0 12px; text-align: center; }
    .btn { display: inline-block; padding: 10px 20px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 8px; margin: 4px 6px; }
    .btn-primary { background: #0f172a; color: #ffffff !important; }
    .btn-outline { background: #ffffff; color: #0f172a !important; border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${businessName}</h1>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">This is an automated notification from ${businessName}.</p>
      <p style="margin: 0;">Powered by BookingGo SaaS Platform</p>
    </div>
  </div>
</body>
</html>
`;
}

// ----------------------------------------------------------------------
// Specific Workflow Notification Triggers
// ----------------------------------------------------------------------

export interface BookingEmailPayload {
  customerName: string;
  customerEmail: string;
  appointmentNumber: string;
  serviceName: string;
  servicePrice: number;
  staffName: string;
  locationName: string;
  locationAddress?: string;
  date: string;
  time: string;
  durationMinutes: number;
  paymentType: string;
  paymentStatus: string;
  businessName: string;
  businessSlug: string;
}

/**
 * 1. Send Booking Confirmation Email
 */
export async function sendBookingConfirmationEmail(payload: BookingEmailPayload): Promise<MailerResult> {
  const gcalUrl = getGoogleCalendarUrl({
    title: `${payload.serviceName} - ${payload.businessName}`,
    description: `Appointment Ref: ${payload.appointmentNumber}\nService: ${payload.serviceName}\nStaff: ${payload.staffName}\nPayment: ${payload.paymentType} (${payload.paymentStatus})`,
    location: payload.locationAddress || payload.locationName,
    dateStr: payload.date,
    timeSlot: payload.time,
    appointmentNumber: payload.appointmentNumber,
  });

  const outlookUrl = getOutlookCalendarUrl({
    title: `${payload.serviceName} - ${payload.businessName}`,
    description: `Appointment Ref: ${payload.appointmentNumber}\nService: ${payload.serviceName}\nStaff: ${payload.staffName}`,
    location: payload.locationAddress || payload.locationName,
    dateStr: payload.date,
    timeSlot: payload.time,
    appointmentNumber: payload.appointmentNumber,
  });

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">Appointment Confirmed</span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #0f172a;">Your Booking is Received!</h2>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Hello ${payload.customerName}, your appointment has been scheduled successfully.</p>
    </div>

    <table class="table-details">
      <tr>
        <td class="label">Reference No.</td>
        <td class="value"><strong style="font-family: monospace; font-size: 15px;">${payload.appointmentNumber}</strong></td>
      </tr>
      <tr>
        <td class="label">Service</td>
        <td class="value">${payload.serviceName}</td>
      </tr>
      <tr>
        <td class="label">Specialist / Staff</td>
        <td class="value">${payload.staffName}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value">${payload.date} at ${payload.time}</td>
      </tr>
      <tr>
        <td class="label">Estimated Duration</td>
        <td class="value">${payload.durationMinutes} Minutes</td>
      </tr>
      <tr>
        <td class="label">Location</td>
        <td class="value">${payload.locationName}</td>
      </tr>
      <tr>
        <td class="label">Payment Method</td>
        <td class="value">${payload.paymentType} (<span style="text-transform: capitalize;">${payload.paymentStatus}</span>)</td>
      </tr>
      <tr>
        <td class="label">Total Amount</td>
        <td class="value" style="font-size: 16px; color: #0f172a;">$${payload.servicePrice.toFixed(2)}</td>
      </tr>
    </table>

    <div class="button-group">
      <a href="${gcalUrl}" target="_blank" class="btn btn-primary">📅 Add to Google Calendar</a>
      <a href="${outlookUrl}" target="_blank" class="btn btn-outline">Outlook / Apple</a>
    </div>
  `;

  return sendEmail({
    to: payload.customerEmail,
    subject: `Booking Confirmed: ${payload.serviceName} [${payload.appointmentNumber}]`,
    html: wrapInEmailTemplate(content, payload.businessName),
    fromName: payload.businessName,
  });
}

/**
 * 2. Send Payment Receipt Email
 */
export async function sendPaymentReceiptEmail(params: {
  customerName: string;
  customerEmail: string;
  appointmentNumber: string;
  serviceName: string;
  amount: number;
  discountAmount?: number;
  finalAmount: number;
  paymentType: string;
  paymentDate?: Date | string;
  businessName: string;
}): Promise<MailerResult> {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">Payment Received</span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #0f172a;">Official Payment Receipt</h2>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Thank you for your payment, ${params.customerName}.</p>
    </div>

    <table class="table-details">
      <tr>
        <td class="label">Appointment Ref</td>
        <td class="value"><strong style="font-family: monospace;">${params.appointmentNumber}</strong></td>
      </tr>
      <tr>
        <td class="label">Service</td>
        <td class="value">${params.serviceName}</td>
      </tr>
      <tr>
        <td class="label">Payment Method</td>
        <td class="value">${params.paymentType}</td>
      </tr>
      <tr>
        <td class="label">Subtotal</td>
        <td class="value">$${params.amount.toFixed(2)}</td>
      </tr>
      ${params.discountAmount ? `
      <tr>
        <td class="label">Discount Applied</td>
        <td class="value" style="color: #16a34a;">-$${params.discountAmount.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr style="border-top: 2px solid #0f172a;">
        <td class="label" style="font-weight: 700; color: #0f172a;">Total Paid</td>
        <td class="value" style="font-size: 18px; font-weight: 700; color: #0f172a;">$${params.finalAmount.toFixed(2)}</td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Payment Receipt for ${params.appointmentNumber} - ${params.businessName}`,
    html: wrapInEmailTemplate(content, params.businessName),
    fromName: params.businessName,
  });
}

/**
 * 3. Send Rescheduled Notification Email
 */
export async function sendAppointmentRescheduledEmail(params: {
  customerName: string;
  customerEmail: string;
  appointmentNumber: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  businessName: string;
}): Promise<MailerResult> {
  const gcalUrl = getGoogleCalendarUrl({
    title: `${params.serviceName} - ${params.businessName}`,
    description: `Rescheduled Appointment Ref: ${params.appointmentNumber}`,
    location: params.locationName,
    dateStr: params.newDate,
    timeSlot: params.newTime,
    appointmentNumber: params.appointmentNumber,
  });

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-warning">Appointment Rescheduled</span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #0f172a;">Your Schedule Has Changed</h2>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Hello ${params.customerName}, your appointment time has been successfully updated.</p>
    </div>

    <table class="table-details">
      <tr>
        <td class="label">Appointment Ref</td>
        <td class="value"><strong style="font-family: monospace;">${params.appointmentNumber}</strong></td>
      </tr>
      <tr>
        <td class="label">Service</td>
        <td class="value">${params.serviceName}</td>
      </tr>
      <tr>
        <td class="label">Previous Date & Time</td>
        <td class="value" style="color: #94a3b8; text-decoration: line-through;">${params.oldDate} at ${params.oldTime}</td>
      </tr>
      <tr>
        <td class="label" style="color: #0f172a; font-weight: 700;">New Date & Time</td>
        <td class="value" style="color: #0f172a; font-weight: 700; font-size: 15px;">${params.newDate} at ${params.newTime}</td>
      </tr>
      <tr>
        <td class="label">Location</td>
        <td class="value">${params.locationName}</td>
      </tr>
    </table>

    <div class="button-group">
      <a href="${gcalUrl}" target="_blank" class="btn btn-primary">📅 Update Google Calendar</a>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Rescheduled: Your appointment ${params.appointmentNumber} has been updated`,
    html: wrapInEmailTemplate(content, params.businessName),
    fromName: params.businessName,
  });
}

/**
 * 4. Send Cancellation Notification Email
 */
export async function sendAppointmentCancellationEmail(params: {
  customerName: string;
  customerEmail: string;
  appointmentNumber: string;
  serviceName: string;
  date: string;
  time: string;
  reason?: string;
  businessName: string;
}): Promise<MailerResult> {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background: #fee2e2; color: #b91c1c;">Appointment Cancelled</span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #0f172a;">Appointment Cancellation Notice</h2>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Hello ${params.customerName}, your appointment has been cancelled.</p>
    </div>

    <table class="table-details">
      <tr>
        <td class="label">Appointment Ref</td>
        <td class="value"><strong style="font-family: monospace;">${params.appointmentNumber}</strong></td>
      </tr>
      <tr>
        <td class="label">Service</td>
        <td class="value">${params.serviceName}</td>
      </tr>
      <tr>
        <td class="label">Scheduled For</td>
        <td class="value">${params.date} at ${params.time}</td>
      </tr>
      ${params.reason ? `
      <tr>
        <td class="label">Cancellation Reason</td>
        <td class="value" style="color: #b91c1c;">${params.reason}</td>
      </tr>
      ` : ''}
    </table>

    <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 24px;">
      If you need to reschedule or have questions, please visit our online booking portal.
    </p>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Cancelled: Appointment ${params.appointmentNumber}`,
    html: wrapInEmailTemplate(content, params.businessName),
    fromName: params.businessName,
  });
}

/**
 * 5. Send Appointment Reminder Email
 */
export async function sendAppointmentReminderEmail(params: {
  customerName: string;
  customerEmail: string;
  appointmentNumber: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  locationAddress?: string;
  date: string;
  time: string;
  durationMinutes: number;
  businessName: string;
  businessSlug: string;
}): Promise<MailerResult> {
  const gcalUrl = getGoogleCalendarUrl({
    title: `${params.serviceName} - ${params.businessName}`,
    description: `Upcoming Appointment Ref: ${params.appointmentNumber}\\nStaff: ${params.staffName}\\nLocation: ${params.locationName}`,
    location: params.locationAddress || params.locationName,
    dateStr: params.date,
    timeSlot: params.time,
    appointmentNumber: params.appointmentNumber,
  });

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background: #e0e7ff; color: #3730a3;">Upcoming Appointment</span>
      <h2 style="margin: 12px 0 6px; font-size: 22px; color: #0f172a;">Reminder: You have an upcoming booking</h2>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Hello ${params.customerName}, this is a friendly reminder for your appointment tomorrow with ${params.businessName}.</p>
    </div>

    <table class="table-details">
      <tr>
        <td class="label">Appointment Ref</td>
        <td class="value"><strong style="font-family: monospace;">${params.appointmentNumber}</strong></td>
      </tr>
      <tr>
        <td class="label">Service</td>
        <td class="value">${params.serviceName} (${params.durationMinutes} mins)</td>
      </tr>
      <tr>
        <td class="label">Staff Specialist</td>
        <td class="value">${params.staffName}</td>
      </tr>
      <tr>
        <td class="label">Location</td>
        <td class="value">${params.locationName}${params.locationAddress ? ` &bull; <span style="font-size: 12px; color: #64748b;">${params.locationAddress}</span>` : ''}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="value" style="color: #0f172a; font-weight: 700; font-size: 15px;">${params.date} at ${params.time}</td>
      </tr>
    </table>

    <div class="button-group">
      <a href="${gcalUrl}" target="_blank" class="btn btn-primary">📅 Open in Calendar</a>
    </div>

    <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
      Need to reschedule or contact us? Please visit our portal. We look forward to seeing you!
    </p>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject: `Reminder: Your appointment with ${params.businessName} on ${params.date} at ${params.time}`,
    html: wrapInEmailTemplate(content, params.businessName),
    fromName: params.businessName,
  });
}
