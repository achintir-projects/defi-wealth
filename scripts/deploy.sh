#!/bin/bash

# Deployment script for Netlify with Neon PostgreSQL
# This script prepares the project for production deployment

echo "🚀 Preparing for Netlify deployment with Neon PostgreSQL..."

# Generate Prisma client for PostgreSQL
echo "📦 Generating Prisma client for PostgreSQL..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "🎉 Project ready for Netlify deployment!"
echo ""
echo "📋 Important:"
echo "1. DATABASE_URL is already configured for Neon PostgreSQL"
echo "2. Both development and production use the same Neon database"
echo "3. Your Neon database should be active and accessible"
echo ""
echo "🔗 To deploy:"
echo "   git add ."
echo "   git commit -m 'Configure Neon PostgreSQL for all environments'"
echo "   git push origin master"