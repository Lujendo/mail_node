/**
 * Database initialization and schema setup
 */

import { initializeConnection, query, execute, getDbType } from './connection';

export async function initializeDatabase(): Promise<void> {
  await initializeConnection();
  
  const dbType = getDbType();
  
  if (dbType === 'mysql') {
    await initializeMySQLSchema();
  } else {
    await initializePostgreSQLSchema();
  }
}

async function initializeMySQLSchema(): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      is_verified TINYINT DEFAULT 0,
      verification_token VARCHAR(255),
      verification_token_expires BIGINT,
      reset_token VARCHAR(255),
      reset_token_expires BIGINT,
      created_at BIGINT DEFAULT 0,
      updated_at BIGINT DEFAULT 0,
      INDEX idx_email (email),
      INDEX idx_verification_token (verification_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      icon VARCHAR(255),
      color VARCHAR(50),
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      folder_id INT NOT NULL,
      message_id VARCHAR(255),
      from_email VARCHAR(255),
      from_name VARCHAR(255),
      to_email VARCHAR(255),
      cc VARCHAR(1000),
      bcc VARCHAR(1000),
      subject VARCHAR(500),
      body_plaintext LONGTEXT,
      body_html LONGTEXT,
      is_read TINYINT DEFAULT 0,
      is_starred TINYINT DEFAULT 0,
      has_attachments TINYINT DEFAULT 0,
      thread_id VARCHAR(255),
      received_at BIGINT,
      sent_at BIGINT,
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_folder_id (folder_id),
      INDEX idx_thread_id (thread_id),
      INDEX idx_received_at (received_at),
      FULLTEXT INDEX ft_subject_body (subject, body_plaintext)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email_id INT NOT NULL,
      filename VARCHAR(255),
      content_type VARCHAR(255),
      size INT,
      file_path VARCHAR(500),
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
      INDEX idx_email_id (email_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(255),
      full_name VARCHAR(255),
      company VARCHAR(255),
      phone VARCHAR(20),
      is_favorite TINYINT DEFAULT 0,
      contact_count INT DEFAULT 0,
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS email_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(255),
      username VARCHAR(255),
      password_encrypted VARCHAR(500),
      imap_server VARCHAR(255),
      imap_port INT DEFAULT 993,
      smtp_server VARCHAR(255),
      smtp_port INT DEFAULT 587,
      is_default TINYINT DEFAULT 0,
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(500),
      expires_at BIGINT,
      created_at BIGINT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await execute(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  console.log('✅ MySQL schema initialized');
}

async function initializePostgreSQLSchema(): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      is_verified SMALLINT DEFAULT 0,
      verification_token VARCHAR(255),
      verification_token_expires BIGINT,
      reset_token VARCHAR(255),
      reset_token_expires BIGINT,
      created_at BIGINT DEFAULT 0,
      updated_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

    CREATE TABLE IF NOT EXISTS folders (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      icon VARCHAR(255),
      color VARCHAR(50),
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type);

    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id INT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      message_id VARCHAR(255),
      from_email VARCHAR(255),
      from_name VARCHAR(255),
      to_email VARCHAR(255),
      cc VARCHAR(1000),
      bcc VARCHAR(1000),
      subject VARCHAR(500),
      body_plaintext TEXT,
      body_html TEXT,
      is_read SMALLINT DEFAULT 0,
      is_starred SMALLINT DEFAULT 0,
      has_attachments SMALLINT DEFAULT 0,
      thread_id VARCHAR(255),
      received_at BIGINT,
      sent_at BIGINT,
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
    CREATE INDEX IF NOT EXISTS idx_emails_folder_id ON emails(folder_id);
    CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
    CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);

    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      email_id INT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      filename VARCHAR(255),
      content_type VARCHAR(255),
      size INT,
      file_path VARCHAR(500),
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255),
      full_name VARCHAR(255),
      company VARCHAR(255),
      phone VARCHAR(20),
      is_favorite SMALLINT DEFAULT 0,
      contact_count INT DEFAULT 0,
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

    CREATE TABLE IF NOT EXISTS email_accounts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255),
      username VARCHAR(255),
      password_encrypted VARCHAR(500),
      imap_server VARCHAR(255),
      imap_port INT DEFAULT 993,
      smtp_server VARCHAR(255),
      smtp_port INT DEFAULT 587,
      is_default SMALLINT DEFAULT 0,
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500),
      expires_at BIGINT,
      created_at BIGINT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `;

  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await execute(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  console.log('✅ PostgreSQL schema initialized');
}

// Helper functions for common operations
export async function initializeUserFolders(userId: number): Promise<void> {
  const folders = [
    { name: 'Inbox', type: 'inbox' },
    { name: 'Sent', type: 'sent' },
    { name: 'Drafts', type: 'drafts' },
    { name: 'Trash', type: 'trash' },
    { name: 'Spam', type: 'spam' },
  ];

  for (const folder of folders) {
    await execute(
      'INSERT INTO folders (user_id, name, type, created_at) VALUES (?, ?, ?, ?)',
      [userId, folder.name, folder.type, Math.floor(Date.now() / 1000)]
    );
  }
}

export async function initializeUserSettings(userId: number): Promise<void> {
  // Add any default user settings here
  // This can be extended as needed
}

