#!/bin/bash

# Development script to switch back to SQLite
# This script prepares the project for local development

echo "🔧 Switching to SQLite for local development..."

# Check if backup exists
if [ ! -f "prisma/schema.prisma.backup" ]; then
    echo "❌ No backup schema found. Cannot restore."
    exit 1
fi

# Restore the original schema
cp prisma/schema.prisma.backup prisma/schema.prisma
echo "✅ Restored SQLite schema for development"

# Generate Prisma client for SQLite
echo "📦 Generating Prisma client for SQLite..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
else
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

# Ensure SQLite database exists
if [ ! -f "dev.db" ]; then
    echo "📄 Creating SQLite database..."
    npx prisma db push
fi

echo "🎉 Project ready for local development!"
echo ""
echo "🔗 To start development server:"
echo "   npm run dev"