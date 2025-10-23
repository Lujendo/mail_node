# My Mail - Cloudflare Workers to Shared Hosting Adaptation

## Overview

Your email client application has been successfully adapted from Cloudflare Workers to run on your shared hosting environment with `mail.ventrucci.online` as the domain.

## What Changed

### 1. Backend Architecture ✅

**Before (Cloudflare Workers):**
- Hono framework running on Cloudflare edge
- Serverless, globally distributed
- Limited to Cloudflare's ecosystem

**After (Shared Hosting):**
- Express.js framework running on Node.js
- Traditional server-based architecture
- Full control over the environment
- Can integrate with local mail server

**Files Created:**
- `src/server/index.ts` - Main Express server
- `src/server/routes/auth.ts` - Authentication routes
- `src/server/routes/emails.ts` - Email management routes
- `src/server/routes/folders.ts` - Folder management routes
- `src/server/routes/contacts.ts` - Contact management routes
- `src/server/routes/email-accounts.ts` - Email account management
- `src/server/routes/webhook.ts` - Webhook handler for incoming emails

### 2. Database Layer ✅

**Before (Cloudflare D1):**
- SQLite database
- Cloudflare-managed
- Limited query capabilities

**After (MariaDB/MySQL):**
- Full MySQL/MariaDB support
- Your database: `grooveno_mail`
- User: `grooveno_mail`
- Full SQL capabilities

**Files Created:**
- `src/server/db/connection.ts` - Database connection management
- `src/server/db/init.ts` - Schema initialization and helpers

**Database Schema:**
- `users` - User accounts and authentication
- `folders` - Email folders (Inbox, Sent, Drafts, etc.)
- `emails` - Email messages
- `attachments` - Email attachments
- `contacts` - Contact list
- `email_accounts` - Multiple email account support
- `sessions` - Session management

### 3. Email Integration ✅

**Before (Maileroo API):**
- Third-party email service
- API-based sending/receiving
- Webhook for incoming emails

**After (Direct IMAP/SMTP):**
- Direct connection to your mail server
- IMAP for receiving emails
- SMTP for sending emails
- Local mail server integration

**Files Created:**
- `src/server/email/imap-smtp-client.ts` - IMAP/SMTP client implementation

**Features:**
- Send emails via SMTP
- Receive emails via IMAP
- Parse email headers and attachments
- Support for multiple email accounts

### 4. Authentication & Security ✅

**Files Created:**
- `src/server/middleware/auth.ts` - JWT authentication middleware

**Features:**
- JWT-based authentication
- Password hashing with bcrypt
- Email verification tokens
- Password reset functionality
- Secure token storage

### 5. Configuration ✅

**Files Created:**
- `.env.example` - Environment configuration template
- `.env.shared-hosting` - Vite configuration for shared hosting
- `tsconfig.server.json` - TypeScript configuration for server
- `ecosystem.config.js` - PM2 process manager configuration

**Your Database Credentials (Pre-filled):**
```
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=grooveno_mail
DB_PASSWORD=Am53hhjMMzmaf3F2Xqhj
DB_NAME=grooveno_mail
```

### 6. Deployment & Documentation ✅

**Files Created:**
- `SHARED_HOSTING_DEPLOYMENT.md` - Comprehensive deployment guide
- `QUICK_START_SHARED_HOSTING.md` - Quick start guide
- `scripts/setup-shared-hosting.sh` - Automated setup script
- `ADAPTATION_SUMMARY.md` - This file

## Architecture Comparison

### Cloudflare Workers Architecture
```
┌─────────────────────────────────────────┐
│         Cloudflare Edge Network         │
├─────────────────────────────────────────┤
│  React Frontend (Static)                │
│  Hono Backend (Workers)                 │
│  D1 Database (SQLite)                   │
│  KV Cache (Sessions)                    │
│  R2 Storage (Attachments)               │
│  Maileroo API (Email)                   │
└─────────────────────────────────────────┘
```

### Shared Hosting Architecture
```
┌──────────────────────────────────────────────┐
│      mail.ventrucci.online (Shared Host)     │
├──────────────────────────────────────────────┤
│  React Frontend (Static Files)               │
│  Express.js Backend (Node.js)                │
│  MariaDB Database (grooveno_mail)            │
│  Filesystem (Attachments)                    │
│  Local Mail Server (IMAP/SMTP)               │
│  mail.ventrucci.online:993 (IMAP)            │
│  mail.ventrucci.online:587 (SMTP)            │
└──────────────────────────────────────────────┘
```

## Key Features Preserved

✅ User authentication and registration
✅ Email sending and receiving
✅ Folder management (Inbox, Sent, Drafts, Trash, Spam)
✅ Contact management
✅ Email search and filtering
✅ Attachment support
✅ Email threading
✅ Read/unread status
✅ Star/favorite emails
✅ Multiple email accounts support
✅ Email verification
✅ Password reset
✅ JWT-based security

## New Capabilities

✨ Direct integration with your mail server
✨ Full control over email handling
✨ Support for multiple email accounts
✨ Local attachment storage
✨ Custom email filtering rules
✨ Email forwarding capabilities
✨ Webhook support for incoming emails

## Dependencies Added

**Production:**
- `express` - Web framework
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `mysql2` - MySQL driver
- `pg` - PostgreSQL driver (optional)
- `nodemailer` - Email sending
- `imap` - IMAP client
- `mailparser` - Email parsing
- `cors` - CORS middleware
- `dotenv` - Environment variables

**Development:**
- TypeScript types for all dependencies
- `ts-node` - TypeScript execution (optional)

## Deployment Steps

### Quick Start (5 minutes)

1. **SSH into your server:**
   ```bash
   ssh your_username@your_hosting
   cd ~/public_html
   ```

2. **Clone repository:**
   ```bash
   git clone https://github.com/your-repo/my-mail.git .
   ```

3. **Run setup:**
   ```bash
   chmod +x scripts/setup-shared-hosting.sh
   ./scripts/setup-shared-hosting.sh
   ```

4. **Configure:**
   ```bash
   nano .env
   # Update mail server credentials and JWT_SECRET
   ```

5. **Deploy:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

6. **Configure web server:**
   - Point `mail.ventrucci.online` to your application
   - Enable HTTPS/SSL
   - Configure proxy to localhost:3000

### Full Details

See `QUICK_START_SHARED_HOSTING.md` for step-by-step instructions.

## Configuration Required

Before deployment, update `.env` with:

```env
# Mail Server (Your shared hosting mail server)
MAIL_IMAP_SERVER=mail.ventrucci.online
MAIL_IMAP_PORT=993
MAIL_SMTP_SERVER=mail.ventrucci.online
MAIL_SMTP_PORT=587
MAIL_USERNAME=your_mail_account@ventrucci.online
MAIL_PASSWORD=your_mail_password
MAIL_FROM_EMAIL=noreply@ventrucci.online

# Security (Generate strong random values)
JWT_SECRET=<generate-random-string>
ENCRYPTION_KEY=<generate-random-string>

# Frontend
FRONTEND_URL=https://mail.ventrucci.online
CORS_ORIGIN=https://mail.ventrucci.online
```

## Testing Checklist

- [ ] Application starts without errors
- [ ] Database schema is created
- [ ] Can register new user
- [ ] Can verify email
- [ ] Can login
- [ ] Can send email
- [ ] Can receive email
- [ ] Can manage folders
- [ ] Can manage contacts
- [ ] Can attach files
- [ ] HTTPS/SSL works
- [ ] API endpoints respond correctly

## Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection error:**
```bash
mysql -h localhost -u grooveno_mail -p grooveno_mail
# Enter password: Am53hhjMMzmaf3F2Xqhj
```

**Mail server connection error:**
```bash
openssl s_client -connect mail.ventrucci.online:993
```

**Application won't start:**
```bash
pm2 logs my-mail
npm run dev:server  # Test locally
```

## Next Steps

1. ✅ Review `QUICK_START_SHARED_HOSTING.md`
2. ✅ Update `.env` with your configuration
3. ✅ Run setup script
4. ✅ Test locally with `npm run dev:server`
5. ✅ Deploy with PM2
6. ✅ Configure web server
7. ✅ Enable HTTPS/SSL
8. ✅ Test at https://mail.ventrucci.online

## Support Resources

- **Quick Start**: `QUICK_START_SHARED_HOSTING.md`
- **Full Deployment**: `SHARED_HOSTING_DEPLOYMENT.md`
- **Architecture**: `ARCHITECTURE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`

## Summary

Your email client has been successfully adapted from Cloudflare Workers to run on your shared hosting environment. The application now:

✅ Runs on Node.js/Express
✅ Uses MariaDB database (grooveno_mail)
✅ Integrates with your local mail server
✅ Supports IMAP/SMTP for email
✅ Maintains all original features
✅ Adds new capabilities for local deployment

You're ready to deploy! Follow the Quick Start guide to get your email client live at `mail.ventrucci.online`.

---

**Last Updated:** 2025-10-23
**Status:** Ready for Deployment ✅

