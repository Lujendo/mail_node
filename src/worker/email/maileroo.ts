// Maileroo API integration
// Documentation: https://maileroo.com/docs/

export interface MailerooConfig {
  apiKey: string;
  smtpUsername: string;
}

export interface SendEmailRequest {
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  cc?: Array<{
    email: string;
    name?: string;
  }>;
  bcc?: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  replyTo?: {
    email: string;
    name?: string;
  };
}

export interface SendEmailResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface InboundEmailWebhook {
  _id: string;
  message_id: string;
  domain: string;
  envelope_sender: string;
  recipients: string[];
  headers: Record<string, string[]>;
  body: {
    plaintext: string;
    stripped_plaintext: string;
    html: string;
    stripped_html: string;
    other_parts?: Array<{
      content_type: string;
      contents: string;
    }>;
    raw_mime: {
      url: string;
      size: number;
    };
  };
  attachments?: Array<{
    filename: string;
    content_id: string;
    content_type: string;
    url: string;
    size: number;
  }>;
  spf_result: string;
  dkim_result: boolean;
  is_dmarc_aligned: boolean;
  is_spam: boolean;
  deletion_url: string;
  validation_url: string;
  processed_at: number;
}

/**
 * Maileroo API client
 */
export class MailerooClient {
  private apiKey: string;
  private baseUrl = 'https://smtp.maileroo.com/api/v1';

  constructor(config: MailerooConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Send an email via Maileroo API
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          from: request.from,
          to: request.to,
          cc: request.cc,
          bcc: request.bcc,
          subject: request.subject,
          html: request.html,
          text: request.text,
          attachments: request.attachments,
          headers: request.headers,
          reply_to: request.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to send email: ${error}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message_id: data.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate webhook authenticity
   */
  async validateWebhook(validationUrl: string): Promise<boolean> {
    try {
      const response = await fetch(validationUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json<{ success: boolean }>();
      return data.success === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete email from Maileroo storage
   */
  async deleteEmail(deletionUrl: string): Promise<boolean> {
    try {
      const response = await fetch(deletionUrl, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Download attachment from Maileroo
   */
  async downloadAttachment(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return await response.arrayBuffer();
    } catch (error) {
      return null;
    }
  }
}

/**
 * Parse email headers to extract useful information
 */
export function parseEmailHeaders(headers: Record<string, string[]>): {
  from: { email: string; name?: string };
  to: { email: string; name?: string };
  subject: string;
  date?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
} {
  const getFirstHeader = (key: string): string | undefined => {
    const values = headers[key] || headers[key.toLowerCase()];
    return values?.[0];
  };

  const parseAddress = (address: string): { email: string; name?: string } => {
    // Parse "Name <email@example.com>" format
    const match = address.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim().replace(/^["']|["']$/g, ''),
        email: match[2].trim(),
      };
    }
    return { email: address.trim() };
  };

  const fromHeader = getFirstHeader('From') || '';
  const toHeader = getFirstHeader('To') || '';
  const subject = getFirstHeader('Subject') || '';
  const date = getFirstHeader('Date');
  const messageId = getFirstHeader('Message-Id') || getFirstHeader('Message-ID');
  const inReplyTo = getFirstHeader('In-Reply-To');
  const referencesHeader = getFirstHeader('References');

  return {
    from: parseAddress(fromHeader),
    to: parseAddress(toHeader),
    subject,
    date,
    messageId,
    inReplyTo,
    references: referencesHeader ? referencesHeader.split(/\s+/) : undefined,
  };
}

/**
 * Generate thread ID from message headers
 */
export function generateThreadId(messageId: string, inReplyTo?: string, references?: string[]): string {
  // If this is a reply, use the first message ID in the thread
  if (references && references.length > 0) {
    return references[0];
  }
  if (inReplyTo) {
    return inReplyTo;
  }
  // This is a new thread
  return messageId;
}

/**
 * Extract plain text from HTML
 */
export function htmlToPlainText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Replace <br> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHtml(html: string): string {
  // Remove potentially dangerous tags and attributes
  let sanitized = html;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove data: URLs (except images)
  sanitized = sanitized.replace(/src\s*=\s*["']data:(?!image)[^"']*["']/gi, '');
  
  return sanitized;
}

