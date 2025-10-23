# My Mail - Quick Start for Shared Hosting

Deploy your email client to `mail.ventrucci.online` in minutes!

## Your Database is Ready ✅

```
Hostname: localhost
Database: grooveno_mail
Username: grooveno_mail
Password: Am53hhjMMzmaf3F2Xqhj
Server: MariaDB 10.11.13
```

## Step 1: Prepare Your Environment

### 1.1 SSH into Your Server

```bash
ssh your_username@your_hosting_server
cd ~/public_html  # or your web root
```

### 1.2 Clone the Repository

```bash
git clone https://github.com/your-repo/my-mail.git .
# OR upload files via FTP/SFTP
```

### 1.3 Run Setup Script

```bash
chmod +x scripts/setup-shared-hosting.sh
./scripts/setup-shared-hosting.sh
```

This will:
- ✅ Check Node.js installation
- ✅ Install npm dependencies
- ✅ Create .env configuration file
- ✅ Build the application
- ✅ Create PM2 configuration

## Step 2: Configure Your Application

### 2.1 Edit .env File

```bash
nano .env
```

Update these critical settings:

```env
# Already pre-filled with your database:
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=grooveno_mail
DB_PASSWORD=Am53hhjMMzmaf3F2Xqhj
DB_NAME=grooveno_mail

# Update these:
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://mail.ventrucci.online

# Mail server (your shared hosting mail server):
MAIL_IMAP_SERVER=mail.ventrucci.online
MAIL_IMAP_PORT=993
MAIL_SMTP_SERVER=mail.ventrucci.online
MAIL_SMTP_PORT=587
MAIL_USERNAME=your_mail_account@ventrucci.online
MAIL_PASSWORD=your_mail_password
MAIL_FROM_EMAIL=noreply@ventrucci.online

# Generate a strong JWT secret:
JWT_SECRET=your-super-secret-key-here

# CORS configuration:
CORS_ORIGIN=https://mail.ventrucci.online

# Encryption key for passwords:
ENCRYPTION_KEY=your-encryption-key-here
```

**To generate strong secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.2 Test Locally (Optional)

```bash
npm run dev:server
```

Visit `http://localhost:3000` to test. Press Ctrl+C to stop.

## Step 3: Deploy with PM2

### 3.1 Install PM2 Globally

```bash
npm install -g pm2
```

### 3.2 Start Application

```bash
pm2 start ecosystem.config.js
```

### 3.3 Verify It's Running

```bash
pm2 status
pm2 logs my-mail
```

### 3.4 Set Up Auto-Start on Reboot

```bash
pm2 startup
pm2 save
```

## Step 4: Configure Web Server

Your hosting provider likely has Nginx or Apache. Configure it to proxy to your Node.js app.

### For cPanel/WHM Users:

1. Go to **cPanel → Addon Domains** (or **Parked Domains**)
2. Add `mail.ventrucci.online` pointing to your application directory
3. Go to **cPanel → EasyApache** or **AutoSSL** to enable HTTPS
4. Create a `.htaccess` file in your public directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP:Upgrade} websocket [NC]
  RewriteCond %{HTTP:Connection} upgrade [NC]
  RewriteRule ^/?(.*) "http://localhost:3000/$1" [P,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^/?(.*) "http://localhost:3000/$1" [P,L]
</IfModule>
```

### For Nginx Users:

Ask your hosting provider to add this configuration:

```nginx
server {
    listen 80;
    server_name mail.ventrucci.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.ventrucci.online;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 5: Enable HTTPS/SSL

### Using Let's Encrypt (Free)

```bash
# If available on your hosting:
certbot certonly --standalone -d mail.ventrucci.online

# Or use your hosting provider's AutoSSL feature
```

## Step 6: Test Your Deployment

### 6.1 Check Application Status

```bash
pm2 status
pm2 logs my-mail
```

### 6.2 Test API

```bash
curl https://mail.ventrucci.online/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T...",
  "environment": "production"
}
```

### 6.3 Test Frontend

Open https://mail.ventrucci.online in your browser

You should see the login page!

## Step 7: Create Your First Account

1. Click "Sign Up"
2. Enter email, password, and name
3. Check your email for verification link
4. Click the link to verify
5. Login with your credentials
6. Start using your email client!

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs my-mail

# Check if port 3000 is available
lsof -i :3000

# Restart
pm2 restart my-mail
```

### Database connection error

```bash
# Test connection
mysql -h localhost -u grooveno_mail -p grooveno_mail
# Enter password: Am53hhjMMzmaf3F2Xqhj
```

### Mail server connection error

```bash
# Test IMAP
openssl s_client -connect mail.ventrucci.online:993

# Test SMTP
openssl s_client -connect mail.ventrucci.online:587 -starttls smtp
```

### HTTPS/SSL errors

- Verify certificate is installed
- Check certificate expiration: `openssl x509 -in /path/to/cert -text -noout`
- Renew if needed: `certbot renew`

## Maintenance

### View Logs

```bash
pm2 logs my-mail
pm2 logs my-mail --lines 100
```

### Restart Application

```bash
pm2 restart my-mail
```

### Stop Application

```bash
pm2 stop my-mail
```

### Update Application

```bash
git pull origin main
npm install
npm run build
npm run build:server
pm2 restart my-mail
```

### Backup Database

```bash
mysqldump -h localhost -u grooveno_mail -p grooveno_mail > backup_$(date +%Y%m%d).sql
```

## Security Checklist

- [ ] Changed JWT_SECRET to a strong random value
- [ ] Changed ENCRYPTION_KEY to a strong random value
- [ ] Configured MAIL_USERNAME and MAIL_PASSWORD
- [ ] Enabled HTTPS/SSL
- [ ] Set CORS_ORIGIN to your domain
- [ ] Configured firewall to allow only necessary ports
- [ ] Set up regular backups
- [ ] Enabled email verification
- [ ] Reviewed and updated all .env settings

## Next Steps

1. **Customize the UI**: Edit files in `src/react-app/`
2. **Add email templates**: Create custom email templates
3. **Set up email filters**: Implement email filtering rules
4. **Enable advanced features**: Add calendar, scheduling, etc.

## Support & Documentation

- **Full Deployment Guide**: See `SHARED_HOSTING_DEPLOYMENT.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`

## Need Help?

1. Check application logs: `pm2 logs my-mail`
2. Check system logs: `journalctl -u my-mail` (if available)
3. Verify database connection
4. Verify mail server connection
5. Check SSL certificate validity

---

**Congratulations! Your email client is now live at https://mail.ventrucci.online** 🎉

