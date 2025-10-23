# My Mail - Setup Guide

This guide will help you set up your modern email client powered by Cloudflare infrastructure and Maileroo API.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Maileroo account (https://maileroo.com)
- Domain name configured with Cloudflare

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Cloudflare Resources

### 2.1 Create D1 Database

```bash
npx wrangler d1 create my_mail_db
```

Copy the `database_id` from the output and update `wrangler.json`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "my_mail_db",
    "database_id": "YOUR_DATABASE_ID_HERE"
  }
]
```

### 2.2 Initialize Database Schema

```bash
npx wrangler d1 execute my_mail_db --file=./schema.sql
```

### 2.3 Create KV Namespaces

```bash
# Create cache namespace
npx wrangler kv:namespace create KV_CACHE

# Create sessions namespace
npx wrangler kv:namespace create KV_SESSIONS
```

Update `wrangler.json` with the namespace IDs:

```json
"kv_namespaces": [
  {
    "binding": "KV_CACHE",
    "id": "YOUR_KV_CACHE_ID_HERE"
  },
  {
    "binding": "KV_SESSIONS",
    "id": "YOUR_KV_SESSIONS_ID_HERE"
  }
]
```

### 2.4 Create R2 Bucket

```bash
npx wrangler r2 bucket create my-mail-attachments
```

The bucket name is already configured in `wrangler.json`.

## Step 3: Configure Maileroo

### 3.1 Get Maileroo API Credentials

1. Sign up at https://maileroo.com
2. Go to Settings → API Keys
3. Create a new API key
4. Note your SMTP username

### 3.2 Set Environment Variables

Create a `.dev.vars` file in the root directory:

```env
MAILEROO_API_KEY=your_maileroo_api_key_here
MAILEROO_SMTP_USERNAME=your_smtp_username_here
JWT_SECRET=your_random_secret_key_here
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Configure Maileroo Inbound Routing

1. Go to Maileroo Dashboard → Inbound Routing
2. Add your domain's MX records as shown in the dashboard
3. Create a new route:
   - **Expression Type**: Match Recipient or Catch All
   - **Recipient**: `*@yourdomain.com` (or specific addresses)
   - **Action**: Webhook
   - **Webhook URL**: `https://your-worker.workers.dev/api/webhook/email`
   - **Enable DMARC alignment**: Recommended

## Step 4: Update Configuration

### 4.1 Update Email Sender

In `src/worker/routes/auth.ts`, update the sender email:

```typescript
from: {
  email: 'noreply@yourdomain.com',  // Change to your domain
  name: 'My Mail',
}
```

### 4.2 Update Frontend URL

In `src/worker/routes/auth.ts`, the verification and reset URLs use `new URL(c.req.url).origin`. This will automatically use your worker's URL.

## Step 5: Deploy to Cloudflare

### 5.1 Build the Application

```bash
npm run build
```

### 5.2 Deploy

```bash
npm run deploy
```

### 5.3 Set Production Secrets

```bash
npx wrangler secret put MAILEROO_API_KEY
npx wrangler secret put MAILEROO_SMTP_USERNAME
npx wrangler secret put JWT_SECRET
```

## Step 6: Test the Setup

### 6.1 Test Webhook Endpoint

```bash
curl https://your-worker.workers.dev/api/webhook/test
```

### 6.2 Register a Test User

```bash
curl -X POST https://your-worker.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@yourdomain.com",
    "password": "SecurePassword123",
    "fullName": "Test User"
  }'
```

### 6.3 Check Email Verification

Check your email for the verification link and click it.

### 6.4 Login

```bash
curl -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@yourdomain.com",
    "password": "SecurePassword123"
  }'
```

Save the returned token for authenticated requests.

## Step 7: Development

### 7.1 Local Development

```bash
npm run dev
```

This will start:
- Vite dev server on http://localhost:5173
- Cloudflare Workers local environment

### 7.2 Test with Local Database

For local development, you can use the local D1 database:

```bash
npx wrangler d1 execute my_mail_db --local --file=./schema.sql
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Emails
- `GET /api/emails` - List emails
- `GET /api/emails/:id` - Get email details
- `POST /api/emails/send` - Send email
- `GET /api/emails/search?q=query` - Search emails
- `PATCH /api/emails/:id/read` - Mark as read/unread
- `PATCH /api/emails/:id/move` - Move to folder
- `PATCH /api/emails/:id/star` - Star/unstar
- `DELETE /api/emails/:id` - Delete email

### Folders
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `PATCH /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder

### Contacts
- `GET /api/contacts` - List contacts
- `GET /api/contacts/:id` - Get contact
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Webhooks
- `POST /api/webhook/email` - Receive incoming emails (Maileroo)

## Troubleshooting

### Database Issues

If you encounter database errors, try recreating the schema:

```bash
npx wrangler d1 execute my_mail_db --file=./schema.sql
```

### Webhook Not Receiving Emails

1. Check MX records are properly configured
2. Verify webhook URL is correct in Maileroo dashboard
3. Check worker logs: `npx wrangler tail`

### CORS Issues

If you encounter CORS errors, update the origin in `src/worker/index.ts`:

```typescript
app.use("/*", cors({
  origin: "https://your-frontend-domain.com",
  // ...
}));
```

## Next Steps

1. Customize the React frontend (see `src/react-app/`)
2. Add email templates
3. Implement email filters and rules
4. Add support for multiple email accounts
5. Implement email signatures
6. Add calendar integration
7. Implement email scheduling

## Security Considerations

1. Always use HTTPS in production
2. Keep JWT_SECRET secure and rotate regularly
3. Implement rate limiting for API endpoints
4. Enable DMARC, SPF, and DKIM for your domain
5. Regularly update dependencies
6. Monitor audit logs for suspicious activity

## Support

For issues and questions:
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Maileroo: https://maileroo.com/docs/
- Hono: https://hono.dev/

## License

MIT

