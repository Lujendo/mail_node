# My Mail on Node - Release Notes v1.0.0

**Release Date:** October 23, 2025

## 🎉 Welcome to My Mail on Node!

This is the first release of **My Mail on Node**, a complete adaptation of the My Mail email client from Cloudflare Workers to run on shared hosting with a Node.js/Express backend.

---

## 🚀 Major Features

### ✅ Complete Backend Rewrite
- **Framework:** Express.js (replacing Hono/Cloudflare Workers)
- **Language:** TypeScript with full type safety
- **Architecture:** Traditional server-based (replacing serverless)
- **Ready for:** Shared hosting, VPS, dedicated servers

### ✅ Database Adaptation
- **Database:** MySQL/MariaDB (replacing D1 SQLite)
- **Schema:** 7 tables with proper indexes and relationships
- **Connection:** Pooling support for performance
- **Compatibility:** Works with both MySQL and PostgreSQL

### ✅ Email Integration
- **IMAP:** Direct integration for receiving emails
- **SMTP:** Direct integration for sending emails
- **Parser:** Full email parsing with attachment support
- **Replacement:** Direct mail server integration (replacing Maileroo API)

### ✅ Authentication & Security
- **JWT:** Token-based authentication
- **Hashing:** bcrypt password hashing
- **Verification:** Email verification system
- **Reset:** Password reset functionality
- **Encryption:** Secure credential storage

### ✅ Complete API Implementation
- **Auth Routes:** Register, login, verify email, get user
- **Email Routes:** List, get, send, mark read, star, delete
- **Folder Routes:** List, create, update, delete
- **Contact Routes:** List, get, create, update, delete
- **Account Routes:** Manage multiple email accounts
- **Webhook Routes:** Receive incoming emails

### ✅ Frontend Integration
- **React 19:** Modern frontend framework
- **Vite:** Fast build tool
- **TypeScript:** Full type safety
- **Responsive:** Mobile-friendly UI

---

## 📦 What's Included

### Backend Files (11 files)
```
src/server/
├── index.ts                          # Main Express server
├── db/
│   ├── connection.ts                 # Database connection & pooling
│   └── init.ts                       # Schema initialization
├── email/
│   └── imap-smtp-client.ts          # IMAP/SMTP email client
├── middleware/
│   └── auth.ts                       # JWT authentication
└── routes/
    ├── auth.ts                       # Authentication endpoints
    ├── emails.ts                     # Email management
    ├── folders.ts                    # Folder management
    ├── contacts.ts                   # Contact management
    ├── email-accounts.ts             # Account management
    └── webhook.ts                    # Webhook handler
```

### Configuration Files (4 files)
```
.env.example                          # Pre-filled environment template
.env.shared-hosting                   # Vite environment config
tsconfig.server.json                  # TypeScript server config
ecosystem.config.js                   # PM2 process manager config
```

### Documentation (8 files)
```
START_HERE.md                         # Quick overview
QUICK_START_SHARED_HOSTING.md        # 5-minute quick start
DEPLOYMENT_VISUAL_GUIDE.md           # Flowcharts & diagrams
SHARED_HOSTING_DEPLOYMENT.md         # Full deployment guide
DEPLOYMENT_CHECKLIST_SHARED_HOSTING.md # Verification checklist
ADAPTATION_SUMMARY.md                # What changed from Cloudflare
FILES_CREATED_AND_MODIFIED.md        # File index
IMPLEMENTATION_COMPLETE.md           # Project summary
```

### Scripts (1 file)
```
scripts/setup-shared-hosting.sh       # Automated setup script
```

### Modified Files (1 file)
```
package.json                          # Added 10 production dependencies
```

---

## 🔄 Migration from Cloudflare Workers

### What Changed

| Component | Cloudflare | My Mail on Node |
|-----------|-----------|-----------------|
| **Backend** | Hono + Workers | Express.js |
| **Database** | D1 (SQLite) | MySQL/MariaDB |
| **Email** | Maileroo API | Direct IMAP/SMTP |
| **Storage** | R2 Bucket | Filesystem |
| **Cache** | KV Store | In-memory/Database |
| **Sessions** | KV Store | Database |
| **Deployment** | `wrangler deploy` | PM2 + Web Server |
| **Hosting** | Cloudflare | Shared hosting/VPS |

### What Stayed the Same

✅ React 19 frontend
✅ TypeScript codebase
✅ API endpoint structure
✅ User authentication flow
✅ Email client functionality
✅ Folder management
✅ Contact management
✅ Attachment support

---

## 📋 Database Schema

### Tables Created

1. **users** - User accounts and authentication
2. **folders** - Email folders (Inbox, Sent, Drafts, etc.)
3. **emails** - Email messages
4. **attachments** - Email attachments
5. **contacts** - Contact list
6. **email_accounts** - Multiple email accounts
7. **sessions** - Session management

### Indexes Created

- User email lookup
- Folder user lookup
- Email user/folder lookup
- Contact user lookup
- Session user lookup
- Full-text search on emails

---

## 🔐 Security Features

✅ **JWT Authentication** - Secure token-based auth
✅ **Password Hashing** - bcrypt with salt rounds
✅ **Email Verification** - Required for new accounts
✅ **Secure Tokens** - Random token generation
✅ **Password Reset** - Secure reset flow
✅ **HTTPS/SSL** - Enforced encryption
✅ **CORS** - Properly configured
✅ **Environment Variables** - Secure credential storage
✅ **Encryption** - Secure credential encryption

---

## 📦 Dependencies Added

### Production (10 packages)
- `express` - Web framework
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `mysql2` - MySQL driver
- `pg` - PostgreSQL driver
- `nodemailer` - Email sending
- `imap` - IMAP client
- `mailparser` - Email parsing
- `cors` - CORS middleware
- `dotenv` - Environment variables

### Development (7 packages)
- TypeScript types for all dependencies

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MySQL/MariaDB database
- Mail server with IMAP/SMTP

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Lujendo/mail-on-node.git
cd mail-on-node

# 2. Run setup script
chmod +x scripts/setup-shared-hosting.sh
./scripts/setup-shared-hosting.sh

# 3. Configure environment
nano .env
# Update mail server credentials and JWT_SECRET

# 4. Deploy
npm install -g pm2
pm2 start ecosystem.config.js
```

See `QUICK_START_SHARED_HOSTING.md` for detailed instructions.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `START_HERE.md` | Quick overview |
| `QUICK_START_SHARED_HOSTING.md` | 5-minute quick start |
| `DEPLOYMENT_VISUAL_GUIDE.md` | Flowcharts & diagrams |
| `SHARED_HOSTING_DEPLOYMENT.md` | Full deployment guide |
| `DEPLOYMENT_CHECKLIST_SHARED_HOSTING.md` | Verification checklist |
| `ADAPTATION_SUMMARY.md` | What changed |
| `FILES_CREATED_AND_MODIFIED.md` | File index |
| `IMPLEMENTATION_COMPLETE.md` | Project summary |

---

## ✨ Features

### Email Management
✅ Send emails via SMTP
✅ Receive emails via IMAP
✅ Email threading
✅ Attachment support
✅ Email search and filtering
✅ Mark as read/unread
✅ Star/favorite emails
✅ Delete emails

### Folder Management
✅ Inbox
✅ Sent
✅ Drafts
✅ Trash
✅ Spam
✅ Custom folders
✅ Folder counts

### Contact Management
✅ Add contacts
✅ Edit contacts
✅ Delete contacts
✅ Search contacts
✅ Contact groups

### Account Management
✅ Multiple email accounts
✅ Account switching
✅ Account settings
✅ Secure password storage

### User Management
✅ User registration
✅ Email verification
✅ Login/logout
✅ Password reset
✅ Profile management

---

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=grooveno_mail
DB_PASSWORD=Am53hhjMMzmaf3F2Xqhj
DB_NAME=grooveno_mail

# Mail Server
MAIL_IMAP_SERVER=mail.ventrucci.online
MAIL_IMAP_PORT=993
MAIL_SMTP_SERVER=mail.ventrucci.online
MAIL_SMTP_PORT=587
MAIL_USERNAME=your_mail_account
MAIL_PASSWORD=your_mail_password
MAIL_FROM_EMAIL=noreply@ventrucci.online

# Security
JWT_SECRET=<random-string>
ENCRYPTION_KEY=<random-string>

# Server
NODE_ENV=production
PORT=3000
```

---

## 🧪 Testing

### API Health Check
```bash
curl https://mail.ventrucci.online/api/health
```

### User Registration
```bash
curl -X POST https://mail.ventrucci.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","name":"User"}'
```

### Send Email
```bash
curl -X POST https://mail.ventrucci.online/api/emails/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"to":"recipient@example.com","subject":"Test","body":"Test email"}'
```

---

## 🐛 Known Issues

None at this time. This is a fresh release.

---

## 📝 Changelog

### v1.0.0 (October 23, 2025)

**Initial Release**

- ✅ Complete backend rewrite from Hono to Express.js
- ✅ Database adaptation from D1 to MySQL/MariaDB
- ✅ Email integration with direct IMAP/SMTP
- ✅ JWT authentication and security middleware
- ✅ All API routes implemented
- ✅ Comprehensive documentation
- ✅ Automated setup script
- ✅ Pre-filled configuration

---

## 🙏 Credits

**Original Project:** My Mail (Cloudflare Workers Edition)
**Adaptation:** Shared Hosting Edition with Express.js
**Database:** MariaDB 10.11.13
**Mail Server:** mail.ventrucci.online

---

## 📞 Support

For issues, questions, or suggestions:

1. Check the relevant documentation file
2. Review the troubleshooting guide
3. Check application logs: `pm2 logs my-mail`
4. Verify configuration in `.env`

---

## 📄 License

Same as original My Mail project

---

## 🎯 Next Steps

1. **Deploy** to your shared hosting
2. **Configure** mail server credentials
3. **Test** all functionality
4. **Create** user accounts
5. **Start** using your email client!

---

**Status:** ✅ **PRODUCTION READY**

**Version:** 1.0.0 (Shared Hosting Edition)

**Repository:** https://github.com/Lujendo/mail-on-node

🎉 **Welcome to My Mail on Node!**

