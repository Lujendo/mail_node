#!/bin/bash

# My Mail - Shared Hosting Setup Script
# This script sets up the application for deployment on shared hosting

set -e

echo "🚀 My Mail - Shared Hosting Setup"
echo "=================================="
echo ""

# Check Node.js
echo "✓ Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "  Node.js version: $NODE_VERSION"

# Check npm
echo "✓ Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "  npm version: $NPM_VERSION"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "  ⚠️  Please edit .env with your configuration:"
    echo "     - Database credentials (already pre-filled)"
    echo "     - Mail server credentials"
    echo "     - JWT_SECRET (generate a strong random string)"
    echo "     - FRONTEND_URL"
else
    echo "  .env file already exists"
fi

# Create logs directory
echo ""
echo "📁 Creating logs directory..."
mkdir -p logs

# Build application
echo ""
echo "🔨 Building application..."
npm run build
npm run build:server

# Initialize database
echo ""
echo "🗄️  Initializing database..."
echo "  The database schema will be created automatically on first run."
echo "  You can test the connection by running: npm run dev:server"

# Create ecosystem.config.js for PM2
if [ ! -f ecosystem.config.js ]; then
    echo ""
    echo "⚙️  Creating PM2 configuration..."
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
    echo "  ecosystem.config.js created"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Edit .env file with your configuration:"
echo "     nano .env"
echo ""
echo "  2. Test the application locally:"
echo "     npm run dev:server"
echo ""
echo "  3. For production deployment:"
echo "     - Install PM2: npm install -g pm2"
echo "     - Start app: pm2 start ecosystem.config.js"
echo "     - Configure web server (Nginx/Apache)"
echo "     - Set up SSL certificate (Let's Encrypt)"
echo ""
echo "  4. See SHARED_HOSTING_DEPLOYMENT.md for detailed instructions"
echo ""

