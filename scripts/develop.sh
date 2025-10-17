#!/bin/bash

# Development script for Neon PostgreSQL
# This script prepares the project for local development with Neon PostgreSQL

echo "🔧 Preparing for local development with Neon PostgreSQL..."

# Generate Prisma client for PostgreSQL
echo "📦 Generating Prisma client for PostgreSQL..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "🎉 Project ready for local development with Neon PostgreSQL!"
echo ""
echo "📋 Important:"
echo "1. Using Neon PostgreSQL for both development and production"
echo "2. All environments share the same database for consistency"
echo "3. Make sure your Neon database is accessible"
echo ""
echo "🔗 To start development server:"
echo "   npm run dev"