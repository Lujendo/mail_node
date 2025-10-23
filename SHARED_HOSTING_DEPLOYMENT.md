# My Mail - Shared Hosting Deployment Guide

This guide explains how to deploy the My Mail email client to your shared hosting environment at `mail.ventrucci.online`.

## Prerequisites

- Node.js 18+ installed on your shared hosting
- MySQL or PostgreSQL database access
- SSH access to your hosting server
- Mail server running on the same hosting (IMAP/SMTP)
- Domain: `mail.ventrucci.online` configured and pointing to your hosting

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    mail.ventrucci.online                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Frontend (Static Files)                │   │
│  │  - Served by Express.js                             │   │
│  │  - Runs in browser                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Node.js/Express Backend API Server             │   │
│  │  - Runs on port 3000 (or configured port)           │   │
│  │  - Handles authentication, email operations         │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                    ↓                    ↓         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   MySQL/     │  │  Mail Server │  │  Filesystem  │       │
│  │ PostgreSQL   │  │ (IMAP/SMTP)  │  │ (Attachments)│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Prepare Your Hosting Environment

### 1.1 Check Node.js Installation

```bash
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

If Node.js is not installed, contact your hosting provider or install it yourself.

### 1.2 Create Application Directory

```bash
mkdir -p ~/my-mail
cd ~/my-mail
```

### 1.3 Create Database

**For MySQL:**
```bash
mysql -u root -p
CREATE DATABASE my_mail;
CREATE USER 'my_mail_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON my_mail.* TO 'my_mail_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**For PostgreSQL:**
```bash
psql -U postgres
CREATE DATABASE my_mail;
CREATE USER my_mail_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE my_mail TO my_mail_user;
\q
```

## Step 2: Deploy Application

### 2.1 Clone or Upload Repository

```bash
cd ~/my-mail
git clone https://github.com/your-repo/my-mail.git .
# OR upload files via FTP/SFTP
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Build Application

```bash
npm run build
npm run build:server
```

### 2.4 Configure Environment

Copy `.env.example` to `.env` and update with your settings:

```bash
cp .env.example .env
nano .env  # Edit with your configuration
```

**Important settings to update:**
- `DB_TYPE`: mysql or postgresql
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `MAIL_IMAP_SERVER`, `MAIL_SMTP_SERVER`: mail.ventrucci.online
- `MAIL_USERNAME`, `MAIL_PASSWORD`: Your mail server credentials
- `JWT_SECRET`: Generate a strong random string
- `FRONTEND_URL`: https://mail.ventrucci.online
- `CORS_ORIGIN`: https://mail.ventrucci.online

### 2.5 Initialize Database

```bash
# The database schema will be created automatically on first run
# Or manually run:
npm run build:server
node dist/server/index.js
# Press Ctrl+C after seeing "Database initialized successfully"
```

## Step 3: Set Up Process Manager

Use PM2 to keep your application running:

```bash
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'my-mail',
    script: './dist/server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

## Step 4: Configure Web Server (Nginx/Apache)

### For Nginx:

```nginx
server {
    listen 80;
    server_name mail.ventrucci.online;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mail.ventrucci.online;
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/mail.ventrucci.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mail.ventrucci.online/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### For Apache:

```apache
<VirtualHost *:80>
    ServerName mail.ventrucci.online
    Redirect permanent / https://mail.ventrucci.online/
</VirtualHost>

<VirtualHost *:443>
    ServerName mail.ventrucci.online
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/mail.ventrucci.online/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/mail.ventrucci.online/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
</VirtualHost>
```

## Step 5: Set Up SSL Certificate

Use Let's Encrypt for free SSL:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx  # For Nginx
# OR
sudo apt-get install certbot python3-certbot-apache  # For Apache

# Generate certificate
sudo certbot certonly --standalone -d mail.ventrucci.online

# Auto-renewal
sudo certbot renew --dry-run
```

## Step 6: Verify Deployment

### 6.1 Check Application Status

```bash
pm2 status
pm2 logs my-mail
```

### 6.2 Test API Endpoints

```bash
# Health check
curl https://mail.ventrucci.online/api/health

# Register test user
curl -X POST https://mail.ventrucci.online/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ventrucci.online",
    "password": "TestPassword123",
    "fullName": "Test User"
  }'

# Login
curl -X POST https://mail.ventrucci.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ventrucci.online",
    "password": "TestPassword123"
  }'
```

### 6.3 Test Frontend

Open https://mail.ventrucci.online in your browser and verify:
- Login page loads
- Can register new account
- Can login with credentials
- Email interface loads

## Step 7: Configure Mail Server Integration

### 7.1 Verify Mail Server Credentials

Test IMAP/SMTP connection:

```bash
# Test IMAP
openssl s_client -connect mail.ventrucci.online:993

# Test SMTP
openssl s_client -connect mail.ventrucci.online:587 -starttls smtp
```

### 7.2 Update Mail Server Configuration

Ensure your mail server is configured to:
- Accept IMAP connections on port 993 (or configured port)
- Accept SMTP connections on port 587 (or configured port)
- Support TLS/SSL encryption
- Have valid credentials for your mail account

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs my-mail

# Check if port is in use
lsof -i :3000

# Check Node.js version
node --version
```

### Database connection errors

```bash
# Test database connection
mysql -h localhost -u my_mail_user -p my_mail

# Check database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### Mail server connection errors

```bash
# Test IMAP connection
telnet mail.ventrucci.online 993

# Test SMTP connection
telnet mail.ventrucci.online 587
```

### SSL certificate errors

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal
```

## Maintenance

### Regular Backups

```bash
# Backup database
mysqldump -u my_mail_user -p my_mail > backup_$(date +%Y%m%d).sql

# Backup application
tar -czf my-mail-backup-$(date +%Y%m%d).tar.gz ~/my-mail
```

### Monitor Application

```bash
# View logs
pm2 logs my-mail

# Monitor resources
pm2 monit

# Check uptime
pm2 info my-mail
```

### Update Application

```bash
cd ~/my-mail
git pull origin main
npm install
npm run build
npm run build:server
pm2 restart my-mail
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Monitor application logs
- [ ] Keep dependencies updated
- [ ] Use strong database passwords
- [ ] Restrict database access to localhost
- [ ] Enable email verification
- [ ] Set up rate limiting

## Support

For issues:
1. Check application logs: `pm2 logs my-mail`
2. Check system logs: `journalctl -u my-mail`
3. Verify database connection
4. Verify mail server connection
5. Check SSL certificate validity

