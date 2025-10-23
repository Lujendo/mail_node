# My Mail - Deployment Checklist

Use this checklist to ensure your email client is properly configured and deployed.

## Pre-Deployment

### 1. Cloudflare Account Setup
- [ ] Create Cloudflare account
- [ ] Add your domain to Cloudflare
- [ ] Enable Cloudflare Workers on your account
- [ ] Verify domain DNS is managed by Cloudflare

### 2. Maileroo Account Setup
- [ ] Create Maileroo account at https://maileroo.com
- [ ] Verify your domain in Maileroo dashboard
- [ ] Add SPF, DKIM, and DMARC records to your domain
- [ ] Generate API key in Maileroo settings
- [ ] Note your SMTP username

### 3. Local Development Setup
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Install Wrangler CLI: `npm install -g wrangler`
- [ ] Login to Cloudflare: `npx wrangler login`

## Cloudflare Resources

### 4. Create D1 Database
```bash
npx wrangler d1 create my_mail_db
```
- [ ] Copy the `database_id` from output
- [ ] Update `wrangler.json` with the database ID
- [ ] Initialize schema: `npx wrangler d1 execute my_mail_db --file=./schema.sql`

### 5. Create KV Namespaces
```bash
npx wrangler kv:namespace create KV_CACHE
npx wrangler kv:namespace create KV_SESSIONS
```
- [ ] Copy both namespace IDs
- [ ] Update `wrangler.json` with the namespace IDs

### 6. Create R2 Bucket
```bash
npx wrangler r2 bucket create my-mail-attachments
```
- [ ] Verify bucket is created in Cloudflare dashboard

### 7. Configure Environment Variables
Create `.dev.vars` file:
```env
MAILEROO_API_KEY=your_maileroo_api_key
MAILEROO_SMTP_USERNAME=your_smtp_username
JWT_SECRET=your_generated_secret
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] Create `.dev.vars` file
- [ ] Add Maileroo API key
- [ ] Add SMTP username
- [ ] Generate and add JWT secret

## Configuration

### 8. Update Application Settings
- [ ] Update sender email in `src/worker/routes/auth.ts` (line ~60)
- [ ] Update domain in email templates
- [ ] Configure CORS origins in `src/worker/index.ts` if needed
- [ ] Review and adjust cache TTLs in `src/worker/lib/cache.ts`

### 9. Maileroo Inbound Routing
- [ ] Add MX records to your domain (from Maileroo dashboard)
- [ ] Wait for DNS propagation (use `dig MX yourdomain.com` to verify)
- [ ] Create inbound route in Maileroo dashboard:
  - Expression Type: Catch All or Match Recipient
  - Recipient: `*@yourdomain.com`
  - Action: Webhook
  - Webhook URL: `https://your-worker.workers.dev/api/webhook/email`
  - Enable DMARC alignment: Yes

## Testing

### 10. Local Testing
```bash
npm run dev
```
- [ ] Test registration flow
- [ ] Test email verification
- [ ] Test login
- [ ] Test password reset
- [ ] Test email sending (if Maileroo is configured)

### 11. Build Application
```bash
npm run build
```
- [ ] Verify build completes without errors
- [ ] Check `dist/` directory is created

## Deployment

### 12. Deploy to Cloudflare
```bash
npm run deploy
```
- [ ] Deployment succeeds
- [ ] Note the deployed URL (e.g., `my-mail.your-subdomain.workers.dev`)

### 13. Set Production Secrets
```bash
npx wrangler secret put MAILEROO_API_KEY
npx wrangler secret put MAILEROO_SMTP_USERNAME
npx wrangler secret put JWT_SECRET
```
- [ ] Set MAILEROO_API_KEY
- [ ] Set MAILEROO_SMTP_USERNAME
- [ ] Set JWT_SECRET

### 14. Update Maileroo Webhook URL
- [ ] Update webhook URL in Maileroo dashboard to production URL
- [ ] Test webhook: `curl https://your-worker.workers.dev/api/webhook/test`

## Post-Deployment

### 15. Production Testing
- [ ] Register a test user
- [ ] Verify email verification works
- [ ] Test login with verified account
- [ ] Send a test email
- [ ] Receive a test email (send to your domain)
- [ ] Test email search
- [ ] Test folder management
- [ ] Test contact management
- [ ] Test email starring
- [ ] Test email deletion

### 16. Monitor Deployment
```bash
npx wrangler tail
```
- [ ] Monitor logs for errors
- [ ] Check Cloudflare dashboard for metrics
- [ ] Verify no errors in browser console

### 17. Performance Optimization
- [ ] Enable caching in production
- [ ] Monitor D1 query performance
- [ ] Check R2 storage usage
- [ ] Review KV cache hit rates
- [ ] Optimize slow queries if needed

## Security

### 18. Security Checklist
- [ ] JWT_SECRET is strong and unique
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (optional)
- [ ] Email content is sanitized
- [ ] SQL injection prevention is in place
- [ ] HTTPS is enforced
- [ ] Audit logging is enabled

### 19. DNS & Email Security
- [ ] SPF record is configured
- [ ] DKIM is enabled
- [ ] DMARC policy is set
- [ ] MX records are correct
- [ ] Test email deliverability with mail-tester.com

## Custom Domain (Optional)

### 20. Configure Custom Domain
- [ ] Add custom domain in Cloudflare Workers dashboard
- [ ] Update DNS records
- [ ] Update CORS settings to allow custom domain
- [ ] Update Maileroo webhook URL
- [ ] Test with custom domain

## Monitoring & Maintenance

### 21. Set Up Monitoring
- [ ] Enable Cloudflare Analytics
- [ ] Set up error alerts
- [ ] Monitor email delivery rates
- [ ] Track user registrations
- [ ] Monitor storage usage

### 22. Backup Strategy
- [ ] Export D1 database regularly
- [ ] Backup R2 attachments
- [ ] Document configuration
- [ ] Keep secrets in secure location

## Documentation

### 23. Update Documentation
- [ ] Update README with production URL
- [ ] Document any custom configurations
- [ ] Create user guide (optional)
- [ ] Document API endpoints
- [ ] Create troubleshooting guide

## Launch

### 24. Go Live
- [ ] All tests passing
- [ ] Monitoring in place
- [ ] Documentation complete
- [ ] Backup strategy implemented
- [ ] Security measures verified

🎉 **Congratulations! Your email client is now live!**

## Troubleshooting

### Common Issues

**Emails not being received:**
- Check MX records are correct
- Verify Maileroo webhook URL is correct
- Check worker logs for errors
- Verify DMARC alignment

**Authentication errors:**
- Verify JWT_SECRET is set
- Check token expiration
- Clear browser cache and cookies

**Database errors:**
- Verify D1 database is initialized
- Check schema is up to date
- Review query syntax

**Deployment fails:**
- Check wrangler.json configuration
- Verify all resource IDs are correct
- Check for TypeScript errors
- Review build output

## Support

For issues:
- Check worker logs: `npx wrangler tail`
- Review Cloudflare dashboard
- Check Maileroo dashboard
- Review GitHub issues

## Next Steps

After successful deployment:
1. Customize the UI theme
2. Add email templates
3. Implement email filters
4. Add calendar integration
5. Implement email scheduling
6. Add mobile app (optional)
7. Implement team features (optional)

