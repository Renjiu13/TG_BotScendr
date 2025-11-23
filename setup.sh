#!/bin/bash

# Telegram Bot Setup Script for Cloudflare Workers
# This script helps you set up and deploy the bot

set -e

echo "🤖 Telegram Bot Setup Script"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found${NC}"
    echo "Installing wrangler..."
    npm install -g wrangler
fi

echo -e "${GREEN}✅ Wrangler CLI found${NC}"
echo ""

# Check if logged in
echo "Checking Cloudflare login status..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare${NC}"
    echo "Opening browser for login..."
    wrangler login
else
    echo -e "${GREEN}✅ Already logged in to Cloudflare${NC}"
fi
echo ""

# Prompt for configuration
echo "📝 Configuration Setup"
echo "======================"
echo ""

read -p "Enter your Telegram Bot Token: " BOT_TOKEN
read -p "Enter your Image Hosting API URL: " IMG_BED_URL
read -p "Enter Auth Code (optional, press Enter to skip): " AUTH_CODE
read -p "Enter Max File Size in MB (default 20): " MAX_SIZE_MB
MAX_SIZE_MB=${MAX_SIZE_MB:-20}
MAX_FILE_SIZE=$((MAX_SIZE_MB * 1024 * 1024))

read -p "Enter your Telegram User ID (optional, press Enter to skip): " ADMIN_ID
read -p "Enter allowed user IDs (comma-separated, optional): " ALLOWED_USERS_INPUT

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "$(date +%s | sha256sum | base64 | head -c 32)")

echo ""
echo "Generating configuration..."

# Build JSON config
CONFIG="{"
CONFIG="$CONFIG\"TG_BOT_TOKEN\":\"$BOT_TOKEN\","
CONFIG="$CONFIG\"IMG_BED_URL\":\"$IMG_BED_URL\","
CONFIG="$CONFIG\"MAX_FILE_SIZE\":$MAX_FILE_SIZE"

if [ ! -z "$AUTH_CODE" ]; then
    CONFIG="$CONFIG,\"AUTH_CODE\":\"$AUTH_CODE\""
fi

if [ ! -z "$ADMIN_ID" ]; then
    CONFIG="$CONFIG,\"ADMIN_CHAT_ID\":$ADMIN_ID"
fi

if [ ! -z "$ALLOWED_USERS_INPUT" ]; then
    # Convert comma-separated to JSON array
    ALLOWED_USERS="[${ALLOWED_USERS_INPUT}]"
    CONFIG="$CONFIG,\"ALLOWED_USERS\":$ALLOWED_USERS"
fi

CONFIG="$CONFIG,\"WEBHOOK_SECRET\":\"$WEBHOOK_SECRET\""
CONFIG="$CONFIG}"

echo ""
echo "Configuration generated:"
echo "$CONFIG" | jq '.' 2>/dev/null || echo "$CONFIG"
echo ""

read -p "Does this look correct? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Setup cancelled."
    exit 1
fi

# Set secret
echo ""
echo "Setting configuration secret..."
echo "$CONFIG" | wrangler secret put CONFIG

echo -e "${GREEN}✅ Configuration set successfully${NC}"
echo ""

# Ask about KV namespace
read -p "Do you want to enable rate limiting? (requires KV namespace) (y/n): " ENABLE_KV
if [ "$ENABLE_KV" = "y" ]; then
    echo "Creating KV namespace..."
    KV_OUTPUT=$(wrangler kv:namespace create RATE_LIMIT_KV)
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
    
    if [ ! -z "$KV_ID" ]; then
        echo ""
        echo -e "${YELLOW}⚠️  Please add the following to your wrangler.toml:${NC}"
        echo ""
        echo "[[kv_namespaces]]"
        echo "binding = \"RATE_LIMIT_KV\""
        echo "id = \"$KV_ID\""
        echo ""
        read -p "Press Enter to continue..."
    fi
fi

# Deploy
echo ""
read -p "Deploy to Cloudflare Workers now? (y/n): " DEPLOY_NOW
if [ "$DEPLOY_NOW" = "y" ]; then
    echo "Deploying..."
    DEPLOY_OUTPUT=$(wrangler deploy)
    echo "$DEPLOY_OUTPUT"
    
    # Extract worker URL
    WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)
    
    if [ ! -z "$WORKER_URL" ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo "Worker URL: $WORKER_URL"
        echo ""
        
        # Set webhook
        read -p "Set Telegram webhook now? (y/n): " SET_WEBHOOK
        if [ "$SET_WEBHOOK" = "y" ]; then
            echo "Setting webhook..."
            WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
                -H "Content-Type: application/json" \
                -d "{\"url\":\"$WORKER_URL\",\"secret_token\":\"$WEBHOOK_SECRET\",\"max_connections\":40,\"allowed_updates\":[\"message\"]}")
            
            if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
                echo -e "${GREEN}✅ Webhook set successfully!${NC}"
                echo ""
                echo "Verifying webhook..."
                curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq '.'
            else
                echo -e "${RED}❌ Failed to set webhook${NC}"
                echo "$WEBHOOK_RESPONSE" | jq '.'
            fi
        fi
    fi
fi

echo ""
echo "=============================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. Open Telegram and search for your bot"
echo "2. Send /start to activate"
echo "3. Send a file to test upload"
echo ""
echo "Useful commands:"
echo "  npm run deploy     - Deploy updates"
echo "  npm run tail       - View logs"
echo "  npm run dev        - Local development"
echo ""
echo "Documentation:"
echo "  README.md          - General information"
echo "  DEPLOYMENT.md      - Detailed deployment guide"
echo ""
