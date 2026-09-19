import { connectToDatabase } from './db';
import { EmailTemplate, type IEmailTemplateDocument } from '@/models/EmailTemplate';
import { sendEmail, type MailerResult } from './mailer';

export interface DefaultTemplateDefinition {
  name: string;
  slug: string;
  moduleName: string;
  from: string;
  variables: string[];
  defaultSubject: string;
  defaultContent: string;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultTemplateDefinition[] = [
  {
    name: 'New User',
    slug: 'new-user',
    moduleName: 'User',
    from: 'BookingGo Accounts',
    variables: [
      'app_name',
      'company_name',
      'app_url',
      'email',
      'password',
    ],
    defaultSubject: 'Welcome to {app_name} - Your Login Details',
    defaultContent: `
<p>Hello,&nbsp;<br />Welcome to <strong>{app_name}</strong>.</p>
<p>Your account has been created successfully. Below are your login credentials:</p>
<p style="padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-family: monospace;">
  <strong>Email:</strong> {email}<br />
  <strong>Password:</strong> {password}
</p>
<p style="margin-top: 24px;">
  <a href="{app_url}" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Log In to Dashboard</a>
</p>
<p style="margin-top: 24px; color: #64748b; font-size: 13px;">
  Thanks,<br />
  The {app_name} Team
</p>
`,
  },
  {
    name: 'Create Appointment',
    slug: 'create-appointment',
    moduleName: 'Appointment',
    from: 'BookingGo Appointments',
    variables: [
      'app_name',
      'company_name',
      'business_name',
      'app_url',
      'appointment_number',
      'appointment_date',
      'appointment_time',
      'service',
      'service_name',
      'location',
      'staff',
      'staff_name',
      'customer',
      'customer_name',
      'tracking_url',
      'google_meet_link',
      'zoom_meeting_link',
    ],
    defaultSubject: 'Appointment Confirmed: {service} [#{appointment_number}]',
    defaultContent: `
<p>Hello <strong>{customer}</strong>,</p>
<p>Thank you for booking an appointment with us at <strong>{business_name}</strong>. We are excited to confirm your appointment details:</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Appointment Ref</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; text-align: right; font-family: monospace;">#{appointment_number}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Service</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{service}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Date & Time</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{appointment_date} at {appointment_time}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Location</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{location}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Specialist</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{staff}</td>
  </tr>
</table>
<p style="text-align: center; margin: 28px 0 16px;">
  <a href="{tracking_url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px;">Track / Manage Appointment</a>
</p>
<p style="color: #64748b; font-size: 13px;">
  Your appointment has been scheduled successfully. If you need to make any changes, please visit our online portal or contact us.
</p>
<p style="margin-top: 24px; color: #64748b; font-size: 13px;">
  Thanks,<br />
  <strong>{business_name}</strong><br />
  {app_name}
</p>
`,
  },
  {
    name: 'Appointment Status Change',
    slug: 'appointment-status-change',
    moduleName: 'Appointment',
    from: 'BookingGo Notifications',
    variables: [
      'app_name',
      'company_name',
      'business_name',
      'app_url',
      'appointment_number',
      'appointment_date',
      'appointment_time',
      'service',
      'status',
      'customer',
      'customer_name',
      'tracking_url',
    ],
    defaultSubject: 'Appointment Status Update: #{appointment_number} is now {status}',
    defaultContent: `
<p>Hello <strong>{customer}</strong>,</p>
<p>We wanted to inform you of a recent status update regarding your appointment with <strong>{business_name}</strong>.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Appointment Number:</strong> #{appointment_number}</p>
  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Updated Status:</strong> <span style="font-weight: 700; color: #0284c7; text-transform: uppercase;">{status}</span></p>
  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Service:</strong> {service}</p>
  <p style="margin: 0; font-size: 14px;"><strong>Scheduled Date & Time:</strong> {appointment_date} at {appointment_time}</p>
</div>
<p style="text-align: center; margin: 24px 0 16px;">
  <a href="{tracking_url}" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Appointment Status</a>
</p>
<p style="color: #64748b; font-size: 13px;">
  Thank you for choosing {business_name}. We appreciate your trust in our services.
</p>
<p style="margin-top: 24px; color: #64748b; font-size: 13px;">
  Thanks,<br />
  <strong>{business_name}</strong><br />
  {app_name}
</p>
`,
  },
  {
    name: 'Appointment Reminder',
    slug: 'appointment-reminder',
    moduleName: 'Appointment',
    from: 'BookingGo Reminders',
    variables: [
      'app_name',
      'company_name',
      'business_name',
      'app_url',
      'appointment_number',
      'appointment_date',
      'appointment_time',
      'service',
      'location',
      'staff',
      'customer',
      'customer_name',
      'tracking_url',
    ],
    defaultSubject: 'Friendly Reminder: Upcoming Appointment with {business_name}',
    defaultContent: `
<p>Hello <strong>{customer}</strong>,</p>
<p>This is a friendly reminder of your upcoming appointment with <strong>{business_name}</strong>.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Appointment Ref</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; text-align: right; font-family: monospace;">#{appointment_number}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Service</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{service}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Date & Time</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a; text-align: right;">{appointment_date} at {appointment_time}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Location</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{location}</td>
  </tr>
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">Staff</td>
    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">{staff}</td>
  </tr>
</table>
<p style="text-align: center; margin: 24px 0 16px;">
  <a href="{tracking_url}" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Open Appointment Details</a>
</p>
<p style="color: #64748b; font-size: 13px;">
  We look forward to welcoming you on {appointment_date} at {appointment_time}. If you need to make any changes, please let us know in advance.
</p>
<p style="margin-top: 24px; color: #64748b; font-size: 13px;">
  Thanks,<br />
  <strong>{business_name}</strong><br />
  {app_name}
</p>
`,
  },
];

/**
 * Parses and replaces all {variable} shortcodes within a template string.
 * Handles common aliases and default environment fallbacks safely.
 */
export function parseEmailShortcodes(
  templateString: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!templateString) return '';

  const defaultAppName = process.env.APP_NAME || 'BookingGo';
  const defaultAppUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';

  // Build standard lookup map with aliases
  const lookup: Record<string, string> = {
    app_name: String(variables.app_name || defaultAppName),
    app_url: String(variables.app_url || defaultAppUrl),
    company_name: String(variables.company_name || defaultAppName),
    business_name: String(variables.business_name || variables.company_name || defaultAppName),
    email: String(variables.email || ''),
    password: String(variables.password || ''),
    customer: String(variables.customer || variables.customer_name || 'Customer'),
    customer_name: String(variables.customer_name || variables.customer || 'Customer'),
    service: String(variables.service || variables.service_name || 'Service'),
    service_name: String(variables.service_name || variables.service || 'Service'),
    staff: String(variables.staff || variables.staff_name || 'Staff Specialist'),
    staff_name: String(variables.staff_name || variables.staff || 'Staff Specialist'),
    location: String(variables.location || 'Main Location'),
    appointment_date: String(variables.appointment_date || ''),
    appointment_time: String(variables.appointment_time || ''),
    appointment_number: String(variables.appointment_number || ''),
    status: String(variables.status || 'Pending'),
    tracking_url: String(variables.tracking_url || variables.app_url || defaultAppUrl),
    zoom_meeting_link: String(variables.zoom_meeting_link || ''),
    google_meet_link: String(variables.google_meet_link || ''),
  };

  // Merge any additional custom variables provided
  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      lookup[key.toLowerCase()] = String(val);
    }
  }

  // Replace {shortcode} and { shortcode }
  return templateString.replace(/\{(\s*[\w_]+\s*)\}/g, (match, rawKey) => {
    const key = rawKey.trim().toLowerCase();
    if (key in lookup) {
      return lookup[key];
    }
    return match; // Keep unresolved tokens or leave untouched
  });
}

/**
 * Wraps HTML content in a clean, responsive email container layout.
 */
export function wrapInEmailTemplateLayout(contentHtml: string, businessName = 'BookingGo'): string {
  return `<!DOCTYPE html>
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
</html>`;
}

/**
 * Ensures system templates are present in MongoDB collection.
 */
export async function ensureSystemTemplatesSeeded(): Promise<void> {
  await connectToDatabase();
  const count = await EmailTemplate.countDocuments({ isSystem: true });
  if (count >= DEFAULT_EMAIL_TEMPLATES.length) {
    return;
  }

  for (const def of DEFAULT_EMAIL_TEMPLATES) {
    const existing = await EmailTemplate.findOne({ slug: def.slug, isSystem: true });
    if (!existing) {
      await EmailTemplate.create({
        name: def.name,
        slug: def.slug,
        moduleName: def.moduleName,
        from: def.from,
        variables: def.variables,
        isSystem: true,
        companyId: null,
        businessId: null,
        translations: [
          {
            lang: 'en',
            subject: def.defaultSubject,
            content: def.defaultContent,
          },
        ],
      });
    }
  }
}

export interface RenderTemplatedEmailOptions {
  templateNameOrSlug: string;
  lang?: string;
  variables: Record<string, string | number | undefined | null>;
  companyId?: string | null;
  businessId?: string | null;
}

export interface RenderedEmailResult {
  subject: string;
  html: string;
  fromName: string;
}

/**
 * Resolves template (company override -> system template -> fallback default),
 * selects language translation (target lang -> 'en'), and parses all shortcodes.
 */
export async function renderTemplatedEmail(
  options: RenderTemplatedEmailOptions
): Promise<RenderedEmailResult> {
  await connectToDatabase();
  const { templateNameOrSlug, lang = 'en', variables, companyId, businessId } = options;
  const normalizedSlug = templateNameOrSlug.toLowerCase().replace(/\s+/g, '-');

  let templateDoc: IEmailTemplateDocument | null = null;

  // 1. Try company-specific customized override if companyId is given
  if (companyId) {
    const query: Record<string, unknown> = {
      slug: normalizedSlug,
      companyId,
    };
    if (businessId) {
      query.businessId = businessId;
    }
    templateDoc = await EmailTemplate.findOne(query);
  }

  // 2. Fallback to global system template in database
  if (!templateDoc) {
    templateDoc = await EmailTemplate.findOne({
      slug: normalizedSlug,
      isSystem: true,
    });
  }

  let rawSubject = '';
  let rawContent = '';
  let fromName = 'BookingGo Notifications';

  if (templateDoc) {
    fromName = templateDoc.from || fromName;
    const requestedLang = lang.toLowerCase();

    // Look for matching language translation, or fallback to 'en', or first available
    const translation =
      templateDoc.translations.find((t) => t.lang === requestedLang) ||
      templateDoc.translations.find((t) => t.lang === 'en') ||
      templateDoc.translations[0];

    if (translation) {
      rawSubject = translation.subject;
      rawContent = translation.content;
    }
  }

  // 3. Fallback to hardcoded in-memory default if not found in database
  if (!rawSubject || !rawContent) {
    const defaultDef = DEFAULT_EMAIL_TEMPLATES.find(
      (d) => d.slug === normalizedSlug || d.name.toLowerCase() === templateNameOrSlug.toLowerCase()
    );
    if (defaultDef) {
      rawSubject = defaultDef.defaultSubject;
      rawContent = defaultDef.defaultContent;
      fromName = defaultDef.from;
    } else {
      rawSubject = `Notification: ${templateNameOrSlug}`;
      rawContent = `<p>You have received an automated notification regarding ${templateNameOrSlug}.</p>`;
    }
  }

  // Parse variables in subject and content
  const renderedSubject = parseEmailShortcodes(rawSubject, variables);
  const renderedBody = parseEmailShortcodes(rawContent, variables);
  const businessName = String(variables.business_name || variables.company_name || 'BookingGo');
  const fullHtml = wrapInEmailTemplateLayout(renderedBody, businessName);

  return {
    subject: renderedSubject,
    html: fullHtml,
    fromName,
  };
}

export interface SendTemplatedEmailOptions extends RenderTemplatedEmailOptions {
  to: string | string[];
  fromEmail?: string;
}

/**
 * High-level helper: Renders template and immediately dispatches via mailer.
 */
export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions
): Promise<MailerResult> {
  const rendered = await renderTemplatedEmail(options);

  return sendEmail({
    to: options.to,
    subject: rendered.subject,
    html: rendered.html,
    fromName: rendered.fromName,
    fromEmail: options.fromEmail,
  });
}
