# My Mail - Quick Setup Script (PowerShell)
# This script helps you set up the Cloudflare resources needed for My Mail

Write-Host "🚀 My Mail - Quick Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if wrangler is installed
Write-Host "📝 Checking for Wrangler CLI..." -ForegroundColor Yellow
try {
    wrangler --version | Out-Null
    Write-Host "✅ Wrangler CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}
Write-Host ""

# Check if user is logged in
Write-Host "📝 Checking Cloudflare authentication..." -ForegroundColor Yellow
try {
    wrangler whoami | Out-Null
    Write-Host "✅ Authenticated with Cloudflare" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please log in to Cloudflare..." -ForegroundColor Yellow
    wrangler login
}
Write-Host ""

# Create D1 Database
Write-Host "📊 Creating D1 database..." -ForegroundColor Yellow
$D1Output = wrangler d1 create my_mail_db 2>&1 | Out-String
if ($D1Output -match 'database_id = "([^"]+)"') {
    $D1Id = $Matches[1]
    Write-Host "✅ D1 database created: $D1Id" -ForegroundColor Green
    Write-Host "   Please update wrangler.json with this database_id" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  D1 database might already exist. Please check wrangler.json" -ForegroundColor Yellow
}
Write-Host ""

# Create KV Namespaces
Write-Host "🗄️  Creating KV namespaces..." -ForegroundColor Yellow

$KVCacheOutput = wrangler kv:namespace create KV_CACHE 2>&1 | Out-String
if ($KVCacheOutput -match 'id = "([^"]+)"') {
    $KVCacheId = $Matches[1]
    Write-Host "✅ KV_CACHE created: $KVCacheId" -ForegroundColor Green
}

$KVSessionsOutput = wrangler kv:namespace create KV_SESSIONS 2>&1 | Out-String
if ($KVSessionsOutput -match 'id = "([^"]+)"') {
    $KVSessionsId = $Matches[1]
    Write-Host "✅ KV_SESSIONS created: $KVSessionsId" -ForegroundColor Green
}

if ($KVCacheId -and $KVSessionsId) {
    Write-Host "   Please update wrangler.json with these namespace IDs" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  KV namespaces might already exist. Please check wrangler.json" -ForegroundColor Yellow
}
Write-Host ""

# Create R2 Bucket
Write-Host "📦 Creating R2 bucket..." -ForegroundColor Yellow
$R2Output = wrangler r2 bucket create my-mail-attachments 2>&1 | Out-String
if ($R2Output -match "already exists") {
    Write-Host "⚠️  R2 bucket already exists" -ForegroundColor Yellow
} else {
    Write-Host "✅ R2 bucket created: my-mail-attachments" -ForegroundColor Green
}
Write-Host ""

# Generate JWT Secret
Write-Host "🔐 Generating JWT secret..." -ForegroundColor Yellow
$JWTSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "✅ JWT secret generated" -ForegroundColor Green
Write-Host ""

# Create .dev.vars file
Write-Host "📝 Creating .dev.vars file..." -ForegroundColor Yellow
@"
MAILEROO_API_KEY=your_maileroo_api_key_here
MAILEROO_SMTP_USERNAME=your_smtp_username_here
JWT_SECRET=$JWTSecret
"@ | Out-File -FilePath .dev.vars -Encoding UTF8
Write-Host "✅ .dev.vars file created" -ForegroundColor Green
Write-Host ""

# Initialize database schema
Write-Host "🗃️  Initializing database schema..." -ForegroundColor Yellow
if ($D1Id) {
    wrangler d1 execute my_mail_db --file=./schema.sql
    Write-Host "✅ Database schema initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Please update wrangler.json with D1 database_id first, then run:" -ForegroundColor Yellow
    Write-Host "   wrangler d1 execute my_mail_db --file=./schema.sql" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update wrangler.json with the following IDs:" -ForegroundColor White
if ($D1Id) {
    Write-Host "   - D1 Database ID: $D1Id" -ForegroundColor White
}
if ($KVCacheId) {
    Write-Host "   - KV_CACHE ID: $KVCacheId" -ForegroundColor White
}
if ($KVSessionsId) {
    Write-Host "   - KV_SESSIONS ID: $KVSessionsId" -ForegroundColor White
}
Write-Host ""
Write-Host "2. Update .dev.vars with your Maileroo credentials:" -ForegroundColor White
Write-Host "   - Get API key from https://maileroo.com/settings/api-keys" -ForegroundColor White
Write-Host "   - Get SMTP username from Maileroo dashboard" -ForegroundColor White
Write-Host ""
Write-Host "3. Configure Maileroo Inbound Routing:" -ForegroundColor White
Write-Host "   - Add MX records to your domain" -ForegroundColor White
Write-Host "   - Create webhook route pointing to your worker URL" -ForegroundColor White
Write-Host ""
Write-Host "4. Start development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Deploy to production:" -ForegroundColor White
Write-Host "   npm run build && npm run deploy" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For detailed instructions, see SETUP.md" -ForegroundColor Yellow
Write-Host ""

