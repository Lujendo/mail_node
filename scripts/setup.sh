#!/bin/bash

# My Mail - Quick Setup Script
# This script helps you set up the Cloudflare resources needed for My Mail

set -e

echo "🚀 My Mail - Quick Setup Script"
echo "================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI is installed"
echo ""

# Check if user is logged in
echo "📝 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare..."
    wrangler login
fi

echo "✅ Authenticated with Cloudflare"
echo ""

# Create D1 Database
echo "📊 Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create my_mail_db 2>&1)
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$D1_ID" ]; then
    echo "⚠️  D1 database might already exist. Please check wrangler.json"
else
    echo "✅ D1 database created: $D1_ID"
    echo "   Please update wrangler.json with this database_id"
fi
echo ""

# Create KV Namespaces
echo "🗄️  Creating KV namespaces..."

KV_CACHE_OUTPUT=$(wrangler kv:namespace create KV_CACHE 2>&1)
KV_CACHE_ID=$(echo "$KV_CACHE_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

KV_SESSIONS_OUTPUT=$(wrangler kv:namespace create KV_SESSIONS 2>&1)
KV_SESSIONS_ID=$(echo "$KV_SESSIONS_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -z "$KV_CACHE_ID" ] || [ -z "$KV_SESSIONS_ID" ]; then
    echo "⚠️  KV namespaces might already exist. Please check wrangler.json"
else
    echo "✅ KV_CACHE created: $KV_CACHE_ID"
    echo "✅ KV_SESSIONS created: $KV_SESSIONS_ID"
    echo "   Please update wrangler.json with these namespace IDs"
fi
echo ""

# Create R2 Bucket
echo "📦 Creating R2 bucket..."
if wrangler r2 bucket create my-mail-attachments 2>&1 | grep -q "already exists"; then
    echo "⚠️  R2 bucket already exists"
else
    echo "✅ R2 bucket created: my-mail-attachments"
fi
echo ""

# Generate JWT Secret
echo "🔐 Generating JWT secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "✅ JWT secret generated"
echo ""

# Create .dev.vars file
echo "📝 Creating .dev.vars file..."
cat > .dev.vars << EOF
MAILEROO_API_KEY=your_maileroo_api_key_here
MAILEROO_SMTP_USERNAME=your_smtp_username_here
JWT_SECRET=$JWT_SECRET
EOF

echo "✅ .dev.vars file created"
echo ""

# Initialize database schema
echo "🗃️  Initializing database schema..."
if [ ! -z "$D1_ID" ]; then
    wrangler d1 execute my_mail_db --file=./schema.sql
    echo "✅ Database schema initialized"
else
    echo "⚠️  Please update wrangler.json with D1 database_id first, then run:"
    echo "   wrangler d1 execute my_mail_db --file=./schema.sql"
fi
echo ""

# Summary
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update wrangler.json with the following IDs:"
if [ ! -z "$D1_ID" ]; then
    echo "   - D1 Database ID: $D1_ID"
fi
if [ ! -z "$KV_CACHE_ID" ]; then
    echo "   - KV_CACHE ID: $KV_CACHE_ID"
fi
if [ ! -z "$KV_SESSIONS_ID" ]; then
    echo "   - KV_SESSIONS ID: $KV_SESSIONS_ID"
fi
echo ""
echo "2. Update .dev.vars with your Maileroo credentials:"
echo "   - Get API key from https://maileroo.com/settings/api-keys"
echo "   - Get SMTP username from Maileroo dashboard"
echo ""
echo "3. Configure Maileroo Inbound Routing:"
echo "   - Add MX records to your domain"
echo "   - Create webhook route pointing to your worker URL"
echo ""
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "5. Deploy to production:"
echo "   npm run build && npm run deploy"
echo ""
echo "📚 For detailed instructions, see SETUP.md"
echo ""

