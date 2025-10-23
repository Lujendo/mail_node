# My Mail - Troubleshooting Guide

This guide helps you resolve common issues when setting up and running My Mail.

## Table of Contents
- [Setup Issues](#setup-issues)
- [Authentication Issues](#authentication-issues)
- [Email Issues](#email-issues)
- [Database Issues](#database-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)

## Setup Issues

### Wrangler Login Fails

**Problem**: `wrangler login` command fails or doesn't open browser

**Solutions**:
1. Try manual authentication:
   ```bash
   wrangler login --browser=false
   ```
   Then follow the URL provided

2. Check if you're behind a proxy:
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   ```

3. Clear Wrangler cache:
   ```bash
   rm -rf ~/.wrangler
   wrangler login
   ```

### D1 Database Creation Fails

**Problem**: `wrangler d1 create` returns an error

**Solutions**:
1. Check if you're logged in:
   ```bash
   wrangler whoami
   ```

2. Verify your account has Workers enabled:
   - Go to Cloudflare Dashboard
   - Check Workers & Pages section

3. Try with explicit account ID:
   ```bash
   wrangler d1 create my_mail_db --account-id=YOUR_ACCOUNT_ID
   ```

### KV Namespace Creation Fails

**Problem**: KV namespace creation returns "quota exceeded"

**Solutions**:
1. Check existing namespaces:
   ```bash
   wrangler kv:namespace list
   ```

2. Delete unused namespaces:
   ```bash
   wrangler kv:namespace delete --namespace-id=NAMESPACE_ID
   ```

3. Upgrade to Workers Paid plan for higher limits

### R2 Bucket Creation Fails

**Problem**: R2 bucket creation fails

**Solutions**:
1. R2 requires a paid Workers plan
2. Check if bucket already exists:
   ```bash
   wrangler r2 bucket list
   ```

3. Try a different bucket name (must be globally unique)

## Authentication Issues

### JWT Token Invalid

**Problem**: "Invalid token" or "Token expired" errors

**Solutions**:
1. Check JWT_SECRET is set correctly:
   ```bash
   # Development
   cat .dev.vars | grep JWT_SECRET
   
   # Production
   wrangler secret list
   ```

2. Clear browser localStorage:
   ```javascript
   localStorage.clear()
   ```

3. Verify token expiration (default 7 days):
   - Check `src/worker/auth/jwt.ts`
   - Tokens expire after 7 days

4. Regenerate JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Email Verification Not Working

**Problem**: Verification emails not received

**Solutions**:
1. Check Maileroo API key is correct:
   ```bash
   cat .dev.vars | grep MAILEROO_API_KEY
   ```

2. Verify sender email in `src/worker/routes/auth.ts`:
   - Update line ~60 with your verified domain

3. Check Maileroo dashboard for failed sends:
   - Go to https://maileroo.com/dashboard
   - Check "Activity" tab

4. Check spam folder

5. Verify domain is verified in Maileroo:
   - Go to Maileroo → Domains
   - Check verification status

### Password Reset Not Working

**Problem**: Password reset emails not received or token invalid

**Solutions**:
1. Check token expiration (1 hour):
   - Tokens expire after 1 hour
   - Request a new reset if expired

2. Verify email sending (same as email verification above)

3. Check database for reset token:
   ```bash
   wrangler d1 execute my_mail_db --command="SELECT email, reset_token, reset_token_expires FROM users WHERE email='user@example.com'"
   ```

## Email Issues

### Emails Not Being Received

**Problem**: Incoming emails not appearing in inbox

**Solutions**:
1. Verify MX records are correct:
   ```bash
   dig MX yourdomain.com
   ```
   Should point to Maileroo's servers

2. Check Maileroo inbound routing:
   - Go to Maileroo → Inbound Routing
   - Verify webhook URL is correct
   - Should be: `https://your-worker.workers.dev/api/webhook/email`

3. Test webhook manually:
   ```bash
   curl -X POST https://your-worker.workers.dev/api/webhook/email \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

4. Check worker logs:
   ```bash
   wrangler tail
   ```
   Send a test email and watch for errors

5. Verify DMARC alignment in Maileroo settings

### Emails Not Being Sent

**Problem**: Sending emails fails

**Solutions**:
1. Check Maileroo API key:
   ```bash
   curl -X GET https://api.maileroo.com/v1/account \
     -H "X-API-Key: YOUR_API_KEY"
   ```

2. Verify sender domain is verified in Maileroo

3. Check SPF/DKIM records:
   ```bash
   dig TXT yourdomain.com
   dig TXT default._domainkey.yourdomain.com
   ```

4. Check Maileroo sending limits:
   - Free tier: 300 emails/month
   - Paid tier: Higher limits

5. Review worker logs for API errors:
   ```bash
   wrangler tail
   ```

### Attachments Not Working

**Problem**: Attachments not uploading or downloading

**Solutions**:
1. Check R2 bucket exists:
   ```bash
   wrangler r2 bucket list
   ```

2. Verify R2 binding in `wrangler.json`:
   ```json
   "r2_buckets": [
     {
       "binding": "R2_ATTACHMENTS",
       "bucket_name": "my-mail-attachments"
     }
   ]
   ```

3. Check file size limits:
   - R2 max object size: 5TB
   - Worker request size: 100MB

4. Test R2 access:
   ```bash
   wrangler r2 object list my-mail-attachments
   ```

### Email Search Not Working

**Problem**: Search returns no results or errors

**Solutions**:
1. Verify FTS5 table exists:
   ```bash
   wrangler d1 execute my_mail_db --command="SELECT name FROM sqlite_master WHERE type='table' AND name='emails_fts'"
   ```

2. Rebuild FTS index:
   ```bash
   wrangler d1 execute my_mail_db --command="INSERT INTO emails_fts(emails_fts) VALUES('rebuild')"
   ```

3. Check search query syntax:
   - Minimum 3 characters
   - Use quotes for exact phrases: `"exact phrase"`

## Database Issues

### Database Schema Not Initialized

**Problem**: "Table does not exist" errors

**Solutions**:
1. Initialize schema:
   ```bash
   npm run db:init
   ```

2. Verify tables exist:
   ```bash
   wrangler d1 execute my_mail_db --command="SELECT name FROM sqlite_master WHERE type='table'"
   ```

3. Check for schema errors:
   ```bash
   wrangler d1 execute my_mail_db --file=./schema.sql
   ```

### Database Query Errors

**Problem**: SQL errors or constraint violations

**Solutions**:
1. Check D1 logs:
   ```bash
   wrangler tail
   ```

2. Verify foreign key constraints:
   ```bash
   wrangler d1 execute my_mail_db --command="PRAGMA foreign_keys"
   ```

3. Check for duplicate entries:
   ```bash
   wrangler d1 execute my_mail_db --command="SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1"
   ```

### Database Migration Issues

**Problem**: Schema changes not applying

**Solutions**:
1. Backup database first:
   ```bash
   wrangler d1 export my_mail_db --output=backup.sql
   ```

2. Apply migration:
   ```bash
   wrangler d1 execute my_mail_db --file=./migration.sql
   ```

3. For major changes, consider recreating:
   ```bash
   wrangler d1 delete my_mail_db
   wrangler d1 create my_mail_db
   npm run db:init
   ```

## Deployment Issues

### Build Fails

**Problem**: `npm run build` fails with TypeScript errors

**Solutions**:
1. Check TypeScript version:
   ```bash
   npx tsc --version
   ```

2. Clear build cache:
   ```bash
   rm -rf dist node_modules/.vite
   npm run build
   ```

3. Fix type errors:
   ```bash
   npx tsc --noEmit
   ```

4. Update dependencies:
   ```bash
   npm update
   ```

### Deployment Fails

**Problem**: `wrangler deploy` fails

**Solutions**:
1. Check wrangler.json syntax:
   ```bash
   cat wrangler.json | jq .
   ```

2. Verify all resource IDs are correct:
   - D1 database_id
   - KV namespace IDs
   - R2 bucket name

3. Check account limits:
   - Free tier: 100,000 requests/day
   - Upgrade if needed

4. Try dry run first:
   ```bash
   npm run check
   ```

### CORS Errors in Production

**Problem**: CORS errors when accessing API

**Solutions**:
1. Update CORS origin in `src/worker/index.ts`:
   ```typescript
   app.use('*', cors({
     origin: 'https://your-frontend-domain.com',
     credentials: true,
   }))
   ```

2. Verify frontend URL matches CORS origin

3. Check browser console for exact error

## Performance Issues

### Slow Email Loading

**Problem**: Emails take long to load

**Solutions**:
1. Enable caching:
   - Check `src/worker/lib/cache.ts`
   - Verify KV_CACHE is working

2. Optimize database queries:
   - Add indexes to frequently queried columns
   - Use LIMIT for pagination

3. Check D1 query performance:
   ```bash
   wrangler tail
   ```
   Look for slow queries

4. Reduce email list page size:
   - Default: 50 emails per page
   - Reduce to 25 or 20

### High Worker CPU Time

**Problem**: Workers hitting CPU time limits

**Solutions**:
1. Optimize expensive operations:
   - Move heavy processing to background
   - Use caching aggressively

2. Check for infinite loops or recursion

3. Profile worker performance:
   ```bash
   wrangler tail
   ```

4. Consider Workers Paid plan for higher limits

### Cache Not Working

**Problem**: KV cache not improving performance

**Solutions**:
1. Verify KV namespace is bound:
   ```bash
   wrangler kv:namespace list
   ```

2. Check cache TTLs in `src/worker/lib/cache.ts`:
   - Email lists: 5 minutes
   - Folders: 10 minutes
   - Contacts: 10 minutes

3. Monitor cache hit rates:
   - Add logging to cache functions
   - Check Cloudflare Analytics

4. Invalidate stale cache:
   ```bash
   wrangler kv:key delete --namespace-id=NAMESPACE_ID "cache-key"
   ```

## Getting Help

If you're still experiencing issues:

1. **Check Worker Logs**:
   ```bash
   wrangler tail
   ```

2. **Review Cloudflare Dashboard**:
   - Workers & Pages → Your Worker → Logs
   - Check for errors and warnings

3. **Check Maileroo Dashboard**:
   - Activity tab for email delivery status
   - Inbound routing for webhook status

4. **Enable Debug Logging**:
   Add console.log statements in worker code

5. **Community Support**:
   - Cloudflare Discord
   - Cloudflare Community Forums
   - GitHub Issues

## Useful Commands

```bash
# View worker logs
wrangler tail

# Check D1 database
wrangler d1 execute my_mail_db --command="SELECT * FROM users LIMIT 5"

# List KV keys
wrangler kv:key list --namespace-id=NAMESPACE_ID

# List R2 objects
wrangler r2 object list my-mail-attachments

# Check secrets
wrangler secret list

# Dry run deployment
npm run check

# View account info
wrangler whoami
```

