# My Mail - Visual Deployment Guide

## 🚀 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    START HERE                               │
│              Read QUICK_START_SHARED_HOSTING.md             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: SSH into Server                                    │
│  $ ssh your_username@your_hosting                           │
│  $ cd ~/public_html                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Clone Repository                                   │
│  $ git clone https://github.com/your-repo/my-mail.git .    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Run Setup Script                                   │
│  $ chmod +x scripts/setup-shared-hosting.sh                 │
│  $ ./scripts/setup-shared-hosting.sh                        │
│                                                              │
│  This will:                                                 │
│  ✓ Check Node.js                                           │
│  ✓ Install dependencies                                    │
│  ✓ Create .env file                                        │
│  ✓ Build application                                       │
│  ✓ Create PM2 config                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Configure Environment                              │
│  $ nano .env                                                │
│                                                              │
│  Update:                                                    │
│  ✓ MAIL_USERNAME (your mail account)                       │
│  ✓ MAIL_PASSWORD (your mail password)                      │
│  ✓ JWT_SECRET (generate random)                            │
│  ✓ ENCRYPTION_KEY (generate random)                        │
│                                                              │
│  Database is pre-filled:                                    │
│  ✓ DB_USER=grooveno_mail                                   │
│  ✓ DB_PASSWORD=Am53hhjMMzmaf3F2Xqhj                        │
│  ✓ DB_NAME=grooveno_mail                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Test Locally (Optional)                            │
│  $ npm run dev:server                                       │
│  Visit: http://localhost:3000                              │
│  Press Ctrl+C to stop                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Deploy with PM2                                    │
│  $ npm install -g pm2                                       │
│  $ pm2 start ecosystem.config.js                            │
│  $ pm2 status                                               │
│  $ pm2 logs my-mail                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Configure Web Server                               │
│                                                              │
│  For cPanel/Apache:                                         │
│  ✓ Add addon domain: mail.ventrucci.online                 │
│  ✓ Create .htaccess with proxy rules                       │
│  ✓ Enable AutoSSL                                          │
│                                                              │
│  For Nginx:                                                 │
│  ✓ Create server block                                     │
│  ✓ Configure proxy to localhost:3000                       │
│  ✓ Enable SSL                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 8: Enable HTTPS/SSL                                   │
│  $ certbot certonly --standalone -d mail.ventrucci.online  │
│  OR use hosting provider's AutoSSL                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 9: Test Deployment                                    │
│  $ curl https://mail.ventrucci.online/api/health           │
│  Open: https://mail.ventrucci.online in browser            │
│  Verify login page loads                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 10: Create First Account                              │
│  ✓ Click "Sign Up"                                         │
│  ✓ Enter email, password, name                             │
│  ✓ Check email for verification link                       │
│  ✓ Click link to verify                                    │
│  ✓ Login with credentials                                  │
│  ✓ Start using email client!                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    🎉 LIVE!                                 │
│            https://mail.ventrucci.online                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  INTERNET / USERS                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Web Server (Nginx/Apache)                      │
│         mail.ventrucci.online:443 (HTTPS)                  │
└────────────────────┬────────────────────────────────────────┘
                     │ Proxy
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Node.js/Express Application                         │
│              localhost:3000                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Frontend (Static Files)                       │  │
│  │  - index.html, CSS, JavaScript                       │  │
│  │  - Served by Express.js                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js Backend API                              │  │
│  │  - /api/auth - Authentication                        │  │
│  │  - /api/emails - Email management                    │  │
│  │  - /api/folders - Folder management                  │  │
│  │  - /api/contacts - Contact management                │  │
│  │  - /api/email-accounts - Account management          │  │
│  │  - /api/webhook - Incoming emails                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  MariaDB     │ │   Mail   │ │  Filesystem  │
│  Database    │ │  Server  │ │  (Files)     │
│              │ │          │ │              │
│ grooveno_    │ │ IMAP:993 │ │ Attachments  │
│ mail         │ │ SMTP:587 │ │              │
│              │ │          │ │              │
│ Tables:      │ │ Local    │ │ Temp files   │
│ - users      │ │ mail.    │ │              │
│ - emails     │ │ ventrucci│ │              │
│ - folders    │ │ .online  │ │              │
│ - contacts   │ │          │ │              │
│ - etc.       │ │          │ │              │
└──────────────┘ └──────────┘ └──────────────┘
```

---

## 🔄 Email Flow

```
SENDING EMAIL:
┌──────────────┐
│ User clicks  │
│ "Send Email" │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ Frontend sends to API        │
│ POST /api/emails/send        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Backend validates request    │
│ Checks authentication        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Connect to SMTP server       │
│ mail.ventrucci.online:587    │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Send email via SMTP          │
│ (nodemailer)                 │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Save to "Sent" folder        │
│ in database                  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Return success to frontend   │
│ Update UI                    │
└──────────────────────────────┘

RECEIVING EMAIL:
┌──────────────────────────────┐
│ Email arrives at mail server │
│ mail.ventrucci.online        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Mail server stores email     │
│ (IMAP mailbox)               │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ User opens email client      │
│ Frontend requests emails     │
│ GET /api/emails              │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Backend connects to IMAP     │
│ mail.ventrucci.online:993    │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Fetch emails from IMAP       │
│ Parse headers & attachments  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Store in database            │
│ (emails table)               │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Return to frontend           │
│ Display in inbox             │
└──────────────────────────────┘
```

---

## 📋 Configuration Checklist

```
BEFORE DEPLOYMENT:

Database (Pre-filled ✓)
  ✓ DB_TYPE=mysql
  ✓ DB_HOST=localhost
  ✓ DB_USER=grooveno_mail
  ✓ DB_PASSWORD=Am53hhjMMzmaf3F2Xqhj
  ✓ DB_NAME=grooveno_mail

Mail Server (UPDATE REQUIRED)
  ☐ MAIL_IMAP_SERVER=mail.ventrucci.online
  ☐ MAIL_IMAP_PORT=993
  ☐ MAIL_SMTP_SERVER=mail.ventrucci.online
  ☐ MAIL_SMTP_PORT=587
  ☐ MAIL_USERNAME=your_mail_account@ventrucci.online
  ☐ MAIL_PASSWORD=your_mail_password
  ☐ MAIL_FROM_EMAIL=noreply@ventrucci.online

Security (GENERATE RANDOM VALUES)
  ☐ JWT_SECRET=<random-string>
  ☐ ENCRYPTION_KEY=<random-string>

Frontend
  ☐ FRONTEND_URL=https://mail.ventrucci.online
  ☐ CORS_ORIGIN=https://mail.ventrucci.online

Server
  ☐ NODE_ENV=production
  ☐ PORT=3000
```

---

## 🧪 Testing Checklist

```
AFTER DEPLOYMENT:

API Tests
  ☐ Health check: curl https://mail.ventrucci.online/api/health
  ☐ Response includes status, timestamp, environment

Frontend Tests
  ☐ Page loads: https://mail.ventrucci.online
  ☐ Login page displays
  ☐ No console errors
  ☐ CSS loads correctly
  ☐ Responsive on mobile

Authentication Tests
  ☐ Can register new account
  ☐ Verification email is sent
  ☐ Can click verification link
  ☐ Can login with verified account
  ☐ JWT token is returned
  ☐ Token is stored in localStorage

Email Tests
  ☐ Can send test email
  ☐ Email appears in sent folder
  ☐ Can receive test email
  ☐ Email appears in inbox
  ☐ Email headers are correct
  ☐ Attachments work

Database Tests
  ☐ Can query users table
  ☐ Can query emails table
  ☐ Data is persisted
  ☐ Indexes are working

Mail Server Tests
  ☐ IMAP connection works
  ☐ SMTP connection works
  ☐ Can send via SMTP
  ☐ Can receive via IMAP
```

---

## 🆘 Quick Troubleshooting

```
PROBLEM: Application won't start
SOLUTION:
  1. Check logs: pm2 logs my-mail
  2. Check Node.js: node --version
  3. Check port: lsof -i :3000
  4. Check .env: cat .env | grep DB_

PROBLEM: Database connection error
SOLUTION:
  1. Test connection: mysql -u grooveno_mail -p grooveno_mail
  2. Check database: SHOW DATABASES;
  3. Check tables: USE grooveno_mail; SHOW TABLES;

PROBLEM: Mail server connection error
SOLUTION:
  1. Test IMAP: openssl s_client -connect mail.ventrucci.online:993
  2. Test SMTP: openssl s_client -connect mail.ventrucci.online:587 -starttls smtp
  3. Check credentials in .env

PROBLEM: HTTPS/SSL errors
SOLUTION:
  1. Check certificate: openssl x509 -in /path/to/cert -text -noout
  2. Check expiration date
  3. Renew if needed: certbot renew
```

---

## 📞 Support Resources

| Issue | Document |
|-------|----------|
| Quick start | QUICK_START_SHARED_HOSTING.md |
| Full deployment | SHARED_HOSTING_DEPLOYMENT.md |
| What changed | ADAPTATION_SUMMARY.md |
| Verification | DEPLOYMENT_CHECKLIST_SHARED_HOSTING.md |
| File index | FILES_CREATED_AND_MODIFIED.md |
| Troubleshooting | TROUBLESHOOTING.md |

---

**Ready to deploy? Start with QUICK_START_SHARED_HOSTING.md!** 🚀

