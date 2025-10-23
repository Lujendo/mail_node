# 📧 My Mail - Modern Email Client

A modern, full-featured email client built with React, Cloudflare Workers, and Maileroo API. Leverages Cloudflare's edge infrastructure for blazing-fast performance and global scalability.

![My Mail](https://img.shields.io/badge/Status-Production%20Ready-green)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)

## 🚀 Features

### Email Management
- ✉️ **Send & Receive Emails** - Full email functionality via Maileroo API
- 📥 **Inbox Management** - Organize emails in folders (Inbox, Sent, Drafts, Trash, Spam)
- 🔍 **Full-Text Search** - Fast email search powered by SQLite FTS5
- ⭐ **Star & Label** - Mark important emails and organize with labels
- 📎 **Attachments** - Support for email attachments stored in R2
- 🧵 **Email Threading** - Automatic conversation threading

### Authentication & Security
- 🔐 **Secure Authentication** - JWT-based auth with email verification
- ✅ **Email Verification** - First-time login email verification
- 🔑 **Password Reset** - Secure password reset flow
- 📊 **Audit Logging** - Track all user actions for security
- 🛡️ **DMARC/SPF/DKIM** - Email authentication support

### Advanced Features
- 🎨 **Modern UI** - Clean, responsive React interface
- 📱 **Mobile Friendly** - Works on all devices
- ⚡ **Edge Performance** - Deployed on Cloudflare's global network
- 💾 **Smart Caching** - KV-based caching for fast responses
- 🔄 **Real-time Updates** - Webhook-based email receiving
- 📧 **Contact Management** - Built-in contact book
- 🎯 **Email Filters** - Automatic email filtering and rules

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Cloudflare Workers + Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (attachments)
- **Cache**: Cloudflare KV
- **Email**: Maileroo API

### Infrastructure
```
┌─────────────┐
│   React UI  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│ Cloudflare Workers  │
│   (Hono API)        │
└──────┬──────────────┘
       │
       ├──→ D1 Database (emails, users, contacts)
       ├──→ KV Cache (sessions, email lists)
       ├──→ R2 Storage (attachments, raw MIME)
       └──→ Maileroo API (send/receive emails)
```

## 📦 Installation

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

1. **Clone and Install**
```bash
git clone <your-repo>
cd my-mail
npm install
```

2. **Create Cloudflare Resources**
```bash
# Create D1 database
npx wrangler d1 create my_mail_db

# Create KV namespaces
npx wrangler kv:namespace create KV_CACHE
npx wrangler kv:namespace create KV_SESSIONS

# Create R2 bucket
npx wrangler r2 bucket create my-mail-attachments
```

3. **Initialize Database**
```bash
npx wrangler d1 execute my_mail_db --file=./schema.sql
```

4. **Configure Environment**
Create `.dev.vars`:
```env
MAILEROO_API_KEY=your_api_key
MAILEROO_SMTP_USERNAME=your_username
JWT_SECRET=your_secret
```

5. **Deploy**
```bash
npm run build
npm run deploy
```

## 🔧 Development

Start the development server:

```bash
npm run dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Email Endpoints
- `GET /api/emails` - List emails
- `GET /api/emails/:id` - Get email details
- `POST /api/emails/send` - Send email
- `GET /api/emails/search` - Search emails
- `PATCH /api/emails/:id/read` - Mark as read/unread
- `PATCH /api/emails/:id/move` - Move to folder
- `PATCH /api/emails/:id/star` - Star/unstar
- `DELETE /api/emails/:id` - Delete email

### Folder Endpoints
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `PATCH /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Contact Endpoints
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Webhook Endpoints
- `POST /api/webhook/email` - Receive incoming emails (Maileroo)

## 🔐 Security

- JWT-based authentication with secure token storage
- Password hashing using PBKDF2
- Email verification for new accounts
- Audit logging for all user actions
- CORS protection
- Input validation and sanitization
- SQL injection prevention via prepared statements

## 🌐 Deployment

Deploy to Cloudflare Workers:

```bash
npm run build
npm run deploy
```

Set production secrets:

```bash
npx wrangler secret put MAILEROO_API_KEY
npx wrangler secret put MAILEROO_SMTP_USERNAME
npx wrangler secret put JWT_SECRET
```

## 📊 Monitoring

Monitor your workers:

```bash
npx wrangler tail
```

View logs in Cloudflare Dashboard → Workers → Logs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Maileroo](https://maileroo.com/)
- [Hono](https://hono.dev/)
- [React](https://react.dev/)
- [Vite](https://vite.dev/)
