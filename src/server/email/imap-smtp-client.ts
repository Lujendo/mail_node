/**
 * IMAP/SMTP Email Client
 * Integrates with local mail server for sending and receiving emails
 */

import nodemailer, { Transporter } from 'nodemailer';
import { simpleParser } from 'mailparser';
import { Imap } from 'imap';
import { EventEmitter } from 'events';

export interface EmailConfig {
  imapServer: string;
  imapPort: number;
  smtpServer: string;
  smtpPort: number;
  username: string;
  password: string;
  email: string;
}

export interface SendEmailOptions {
  from: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface ParsedEmail {
  from: { email: string; name?: string };
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class IMAPSMTPClient extends EventEmitter {
  private config: EmailConfig;
  private smtpTransporter: Transporter | null = null;
  private imap: Imap | null = null;

  constructor(config: EmailConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize SMTP transporter
   */
  async initializeSMTP(): Promise<void> {
    this.smtpTransporter = nodemailer.createTransport({
      host: this.config.smtpServer,
      port: this.config.smtpPort,
      secure: this.config.smtpPort === 465,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
    });

    // Verify connection
    try {
      await this.smtpTransporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      throw error;
    }
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.smtpTransporter) {
        await this.initializeSMTP();
      }

      const mailOptions = {
        from: options.from.name
          ? `${options.from.name} <${options.from.email}>`
          : options.from.email,
        to: options.to.map(t => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
        cc: options.cc?.map(t => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
        bcc: options.bcc?.map(t => (t.name ? `${t.name} <${t.email}>` : t.email)).join(', '),
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const info = await this.smtpTransporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('SMTP send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Initialize IMAP connection
   */
  async initializeIMAP(): Promise<void> {
    this.imap = new Imap({
      user: this.config.username,
      password: this.config.password,
      host: this.config.imapServer,
      port: this.config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    this.imap.on('error', (err) => {
      console.error('IMAP error:', err);
      this.emit('error', err);
    });

    this.imap.on('end', () => {
      console.log('IMAP connection ended');
    });

    try {
      await new Promise<void>((resolve, reject) => {
        this.imap!.openBox('INBOX', false, (err, box) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ IMAP connection established');
    } catch (error) {
      console.error('❌ IMAP connection failed:', error);
      throw error;
    }
  }

  /**
   * Fetch emails from IMAP
   */
  async fetchEmails(
    criteria: string[] = ['UNSEEN'],
    limit: number = 50
  ): Promise<ParsedEmail[]> {
    try {
      if (!this.imap) {
        await this.initializeIMAP();
      }

      return new Promise((resolve, reject) => {
        const emails: ParsedEmail[] = [];
        const f = this.imap!.seq.fetch(`1:${limit}`, { bodies: '' });

        f.on('message', (msg) => {
          simpleParser(msg, async (err, parsed) => {
            if (err) {
              console.error('Parse error:', err);
              return;
            }

            const email: ParsedEmail = {
              from: {
                email: parsed.from?.text || '',
                name: parsed.from?.text?.split('<')[0]?.trim(),
              },
              to: {
                email: parsed.to?.text || '',
                name: parsed.to?.text?.split('<')[0]?.trim(),
              },
              subject: parsed.subject || '',
              text: parsed.text || '',
              html: parsed.html || '',
              headers: Object.fromEntries(parsed.headers),
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo,
              references: parsed.references,
              attachments: parsed.attachments?.map(a => ({
                filename: a.filename || 'attachment',
                content: a.content,
                contentType: a.contentType || 'application/octet-stream',
              })) || [],
            };

            emails.push(email);
          });
        });

        f.on('error', reject);
        f.on('end', () => resolve(emails));
      });
    } catch (error) {
      console.error('Fetch emails error:', error);
      throw error;
    }
  }

  /**
   * Close IMAP connection
   */
  async closeIMAP(): Promise<void> {
    if (this.imap) {
      return new Promise((resolve) => {
        this.imap!.closeBox(false, () => {
          this.imap!.end();
          resolve();
        });
      });
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.closeIMAP();
    if (this.smtpTransporter) {
      this.smtpTransporter.close();
    }
  }
}

/**
 * Create default email client for shared hosting mail server
 */
export function createDefaultEmailClient(): IMAPSMTPClient {
  return new IMAPSMTPClient({
    imapServer: process.env.MAIL_IMAP_SERVER || 'mail.ventrucci.online',
    imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993'),
    smtpServer: process.env.MAIL_SMTP_SERVER || 'mail.ventrucci.online',
    smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '587'),
    username: process.env.MAIL_USERNAME || '',
    password: process.env.MAIL_PASSWORD || '',
    email: process.env.MAIL_EMAIL || '',
  });
}

