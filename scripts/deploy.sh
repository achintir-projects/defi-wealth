#!/bin/bash

# Deployment script for Netlify with Neon PostgreSQL
# This script prepares the project for production deployment

echo "🚀 Preparing for Netlify deployment with Neon PostgreSQL..."

# Backup the original schema
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.prisma.backup
    echo "✅ Backed up original SQLite schema"
fi

# Replace with PostgreSQL schema
cp prisma/schema.prisma.production prisma/schema.prisma
echo "✅ Switched to PostgreSQL schema for production"

# Generate Prisma client for PostgreSQL
echo "📦 Generating Prisma client for PostgreSQL..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    # Restore backup
    if [ -f "prisma/schema.prisma.backup" ]; then
        cp prisma/schema.prisma.backup prisma/schema.prisma
        echo "🔄 Restored original schema"
    fi
    exit 1
fi

echo "🎉 Project ready for Netlify deployment!"
echo ""
echo "📋 Important:"
echo "1. Make sure DATABASE_URL is set in Netlify environment variables"
echo "2. The URL should be: postgresql://username:password@host.neon.tech/dbname?sslmode=require"
echo "3. Your Neon database should be active and accessible"
echo ""
echo "🔗 To deploy:"
echo "   git add ."
echo "   git commit -m 'Prepare for production deployment'"
echo "   git push origin master"