# My Mail - Shared Hosting Deployment Checklist

Use this checklist to ensure your email client is properly deployed to shared hosting.

## Pre-Deployment (Local Testing)

### Environment Setup
- [ ] Node.js 18+ installed locally
- [ ] npm installed and working
- [ ] Git installed
- [ ] Repository cloned locally

### Local Testing
- [ ] Run `npm install` successfully
- [ ] Run `npm run build` successfully
- [ ] Run `npm run build:server` successfully
- [ ] Run `npm run dev:server` and verify it starts
- [ ] Access http://localhost:3000 in browser
- [ ] Login page loads correctly
- [ ] API health check works: `curl http://localhost:3000/api/health`

### Configuration Testing
- [ ] `.env` file created with test values
- [ ] Database connection works locally
- [ ] Mail server credentials are correct
- [ ] JWT_SECRET is set to a strong random value
- [ ] ENCRYPTION_KEY is set to a strong random value

## Hosting Environment Preparation

### Server Access
- [ ] SSH access to hosting server confirmed
- [ ] Can navigate to web root directory
- [ ] Have hosting control panel access (cPanel, Plesk, etc.)
- [ ] Know hosting provider's Node.js support

### Database Setup
- [ ] Database created: `grooveno_mail` ✅
- [ ] Database user created: `grooveno_mail` ✅
- [ ] Database password: `Am53hhjMMzmaf3F2Xqhj` ✅
- [ ] Can connect to database from command line
- [ ] Database is empty and ready for schema

### Mail Server Configuration
- [ ] Mail server is running on hosting
- [ ] IMAP port 993 is accessible
- [ ] SMTP port 587 is accessible
- [ ] Have mail account credentials
- [ ] Can test IMAP connection: `openssl s_client -connect mail.ventrucci.online:993`
- [ ] Can test SMTP connection: `openssl s_client -connect mail.ventrucci.online:587 -starttls smtp`

### Domain Configuration
- [ ] Domain `mail.ventrucci.online` is registered
- [ ] Domain DNS points to hosting server
- [ ] Domain is added to hosting account
- [ ] Can access hosting via domain (HTTP)

## Deployment Steps

### Step 1: Upload Application
- [ ] Clone or upload repository to hosting
- [ ] All files are in correct location
- [ ] `.git` directory exists (if using git)
- [ ] File permissions are correct (755 for directories, 644 for files)

### Step 2: Install Dependencies
- [ ] Run `npm install` on server
- [ ] No errors during installation
- [ ] `node_modules` directory created
- [ ] `package-lock.json` updated

### Step 3: Build Application
- [ ] Run `npm run build` successfully
- [ ] `dist/client` directory created with frontend files
- [ ] Run `npm run build:server` successfully
- [ ] `dist/server` directory created with compiled backend

### Step 4: Configure Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Update database credentials (already pre-filled)
- [ ] Update mail server credentials
- [ ] Generate and set JWT_SECRET
- [ ] Generate and set ENCRYPTION_KEY
- [ ] Set FRONTEND_URL to `https://mail.ventrucci.online`
- [ ] Set CORS_ORIGIN to `https://mail.ventrucci.online`
- [ ] Set NODE_ENV to `production`
- [ ] Set PORT to `3000`

### Step 5: Initialize Database
- [ ] Database schema is created automatically on first run
- [ ] Or manually verify tables are created:
  ```bash
  mysql -u grooveno_mail -p grooveno_mail -e "SHOW TABLES;"
  ```

### Step 6: Install PM2
- [ ] Install PM2 globally: `npm install -g pm2`
- [ ] PM2 is accessible: `pm2 --version`
- [ ] `ecosystem.config.js` exists in project root

### Step 7: Start Application
- [ ] Run `pm2 start ecosystem.config.js`
- [ ] Application starts without errors
- [ ] Run `pm2 status` and verify app is running
- [ ] Run `pm2 logs my-mail` and check for errors
- [ ] Application is listening on port 3000

### Step 8: Configure Web Server

#### For cPanel/Apache:
- [ ] Addon domain `mail.ventrucci.online` is created
- [ ] `.htaccess` file is configured for proxy
- [ ] Proxy rules point to `http://localhost:3000`
- [ ] Rewrite rules are enabled

#### For Nginx:
- [ ] Server block for `mail.ventrucci.online` is created
- [ ] Proxy settings point to `http://localhost:3000`
- [ ] Nginx configuration is tested: `nginx -t`
- [ ] Nginx is reloaded: `systemctl reload nginx`

### Step 9: Enable HTTPS/SSL
- [ ] SSL certificate is installed for `mail.ventrucci.online`
- [ ] Certificate is valid and not expired
- [ ] HTTPS redirect is configured (HTTP → HTTPS)
- [ ] Mixed content warnings are resolved
- [ ] SSL/TLS version is modern (TLS 1.2+)

### Step 10: Set Up Auto-Start
- [ ] Run `pm2 startup`
- [ ] Run `pm2 save`
- [ ] Application starts automatically on server reboot
- [ ] Verify with `pm2 info my-mail`

## Testing & Verification

### API Testing
- [ ] Health check works: `curl https://mail.ventrucci.online/api/health`
- [ ] Response includes status, timestamp, and environment
- [ ] API is accessible from outside the server

### Frontend Testing
- [ ] Open https://mail.ventrucci.online in browser
- [ ] Login page loads without errors
- [ ] No console errors in browser developer tools
- [ ] CSS and images load correctly
- [ ] Responsive design works on mobile

### Authentication Testing
- [ ] Can register new account
- [ ] Verification email is sent
- [ ] Can click verification link
- [ ] Can login with verified account
- [ ] JWT token is returned
- [ ] Token is stored in localStorage

### Email Testing
- [ ] Can send test email
- [ ] Email appears in sent folder
- [ ] Can receive test email
- [ ] Email appears in inbox
- [ ] Email headers are parsed correctly
- [ ] Attachments are handled correctly

### Database Testing
- [ ] Can query users table
- [ ] Can query emails table
- [ ] Can query folders table
- [ ] Data is persisted correctly
- [ ] Indexes are working

### Mail Server Testing
- [ ] IMAP connection works
- [ ] SMTP connection works
- [ ] Can send email via SMTP
- [ ] Can receive email via IMAP
- [ ] Email parsing works correctly
- [ ] Attachments are handled

## Performance & Monitoring

### Performance
- [ ] Application responds quickly (< 1 second)
- [ ] Database queries are fast
- [ ] No memory leaks detected
- [ ] CPU usage is reasonable
- [ ] Disk space is sufficient

### Monitoring
- [ ] PM2 monitoring is enabled: `pm2 monit`
- [ ] Application logs are being written
- [ ] Error logs are being captured
- [ ] Log rotation is configured (optional)
- [ ] Monitoring alerts are set up (optional)

### Backups
- [ ] Database backup script is created
- [ ] First backup is taken
- [ ] Backup location is secure
- [ ] Backup restoration is tested

## Security Checklist

### Credentials & Secrets
- [ ] JWT_SECRET is strong and random
- [ ] ENCRYPTION_KEY is strong and random
- [ ] Database password is strong
- [ ] Mail server password is secure
- [ ] No secrets are in version control
- [ ] `.env` file is not committed to git

### Access Control
- [ ] SSH access is restricted
- [ ] Database access is restricted to localhost
- [ ] Mail server credentials are not exposed
- [ ] File permissions are correct
- [ ] `.env` file permissions are 600

### Network Security
- [ ] HTTPS/SSL is enforced
- [ ] HTTP redirects to HTTPS
- [ ] CORS is properly configured
- [ ] Firewall rules are in place
- [ ] Only necessary ports are open

### Application Security
- [ ] Password hashing is enabled (bcrypt)
- [ ] Email verification is required
- [ ] JWT tokens have expiration
- [ ] SQL injection prevention is in place
- [ ] XSS protection is enabled
- [ ] CSRF protection is enabled (if applicable)

## Post-Deployment

### Documentation
- [ ] Deployment notes are documented
- [ ] Configuration is documented
- [ ] Credentials are stored securely
- [ ] Backup procedures are documented
- [ ] Troubleshooting guide is available

### Maintenance
- [ ] Monitoring is set up
- [ ] Alerts are configured
- [ ] Backup schedule is established
- [ ] Update schedule is planned
- [ ] Support contact is available

### User Communication
- [ ] Users are notified of new email client
- [ ] Login instructions are provided
- [ ] Support email is available
- [ ] FAQ is created
- [ ] Feedback mechanism is in place

## Troubleshooting

### If Application Won't Start
- [ ] Check PM2 logs: `pm2 logs my-mail`
- [ ] Check system logs: `journalctl -u my-mail`
- [ ] Verify Node.js is installed: `node --version`
- [ ] Verify port 3000 is available: `lsof -i :3000`
- [ ] Check `.env` file is correct
- [ ] Test locally: `npm run dev:server`

### If Database Connection Fails
- [ ] Verify database is running
- [ ] Check database credentials in `.env`
- [ ] Test connection: `mysql -u grooveno_mail -p grooveno_mail`
- [ ] Verify database exists: `SHOW DATABASES;`
- [ ] Check database user permissions

### If Mail Server Connection Fails
- [ ] Verify mail server is running
- [ ] Check mail server credentials
- [ ] Test IMAP: `openssl s_client -connect mail.ventrucci.online:993`
- [ ] Test SMTP: `openssl s_client -connect mail.ventrucci.online:587 -starttls smtp`
- [ ] Check firewall rules

### If HTTPS/SSL Fails
- [ ] Verify certificate is installed
- [ ] Check certificate expiration: `openssl x509 -in /path/to/cert -text -noout`
- [ ] Verify domain matches certificate
- [ ] Check web server configuration
- [ ] Renew certificate if expired: `certbot renew`

## Sign-Off

- [ ] All checklist items completed
- [ ] Application is live and accessible
- [ ] All tests pass
- [ ] Security measures are in place
- [ ] Monitoring is active
- [ ] Backups are configured
- [ ] Documentation is complete
- [ ] Team is trained on maintenance

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________

---

**Status:** ✅ Ready for Production

Your email client is now live at https://mail.ventrucci.online!

