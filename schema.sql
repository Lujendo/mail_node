-- My Mail Database Schema for Cloudflare D1
-- This schema supports a modern email client with authentication, email management, and contacts

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  is_verified INTEGER DEFAULT 0, -- 0 = not verified, 1 = verified
  verification_token TEXT,
  verification_token_expires INTEGER,
  reset_token TEXT,
  reset_token_expires INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_login INTEGER
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Email folders (inbox, sent, drafts, trash, spam, custom folders)
CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom', -- inbox, sent, drafts, trash, spam, custom
  parent_folder_id INTEGER,
  color TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  folder_id INTEGER NOT NULL,
  message_id TEXT NOT NULL, -- Unique message ID from email headers
  thread_id TEXT, -- For email threading
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,
  cc TEXT, -- JSON array of CC recipients
  bcc TEXT, -- JSON array of BCC recipients
  subject TEXT,
  body_plaintext TEXT,
  body_html TEXT,
  stripped_plaintext TEXT, -- Last message in thread (from Maileroo)
  stripped_html TEXT, -- Last message in thread HTML (from Maileroo)
  is_read INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  is_draft INTEGER DEFAULT 0,
  has_attachments INTEGER DEFAULT 0,
  size_bytes INTEGER DEFAULT 0,
  labels TEXT, -- JSON array of label IDs
  raw_mime_url TEXT, -- URL to raw MIME in R2
  maileroo_id TEXT, -- Maileroo internal ID
  spf_result TEXT,
  dkim_result INTEGER,
  is_dmarc_aligned INTEGER,
  is_spam INTEGER DEFAULT 0,
  received_at INTEGER,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder_id ON emails(folder_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);

-- Email attachments
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  content_id TEXT,
  size_bytes INTEGER DEFAULT 0,
  r2_key TEXT, -- Key in R2 bucket
  url TEXT, -- Temporary URL from Maileroo or R2
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  notes TEXT,
  avatar_url TEXT,
  is_favorite INTEGER DEFAULT 0,
  last_contacted INTEGER,
  contact_count INTEGER DEFAULT 0, -- Number of emails exchanged
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_favorite ON contacts(is_favorite);

-- Labels/Tags for emails
CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);

-- Email search index (for full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
  subject,
  body_plaintext,
  from_email,
  to_email,
  content='emails',
  content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS emails_ai AFTER INSERT ON emails BEGIN
  INSERT INTO emails_fts(rowid, subject, body_plaintext, from_email, to_email)
  VALUES (new.id, new.subject, new.body_plaintext, new.from_email, new.to_email);
END;

CREATE TRIGGER IF NOT EXISTS emails_ad AFTER DELETE ON emails BEGIN
  DELETE FROM emails_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS emails_au AFTER UPDATE ON emails BEGIN
  UPDATE emails_fts SET 
    subject = new.subject,
    body_plaintext = new.body_plaintext,
    from_email = new.from_email,
    to_email = new.to_email
  WHERE rowid = new.id;
END;

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  theme TEXT DEFAULT 'light', -- light, dark, auto
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  signature TEXT,
  auto_reply_enabled INTEGER DEFAULT 0,
  auto_reply_message TEXT,
  notifications_enabled INTEGER DEFAULT 1,
  email_per_page INTEGER DEFAULT 50,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Email filters/rules
CREATE TABLE IF NOT EXISTS email_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  conditions TEXT NOT NULL, -- JSON: [{field: 'from', operator: 'contains', value: 'example.com'}]
  actions TEXT NOT NULL, -- JSON: [{action: 'move_to_folder', folder_id: 5}]
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_filters_user_id ON email_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_email_filters_is_enabled ON email_filters(is_enabled);

-- Audit log for security
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL, -- login, logout, email_sent, email_deleted, etc.
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON with additional info
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Insert default folders for new users (will be done via trigger or application code)
-- This is just a reference for the default folder structure
-- INSERT INTO folders (user_id, name, type) VALUES 
--   (?, 'Inbox', 'inbox'),
--   (?, 'Sent', 'sent'),
--   (?, 'Drafts', 'drafts'),
--   (?, 'Trash', 'trash'),
--   (?, 'Spam', 'spam');

