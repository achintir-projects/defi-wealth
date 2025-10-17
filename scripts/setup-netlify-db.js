const fs = require('fs');
const path = require('path');

// Setup for Neon PostgreSQL
console.log('🚀 Setting up Neon PostgreSQL for Netlify deployment...');

// Check if DATABASE_URL is available
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL environment variable not found');
  console.warn('   Make sure to set DATABASE_URL in Netlify environment variables');
  console.warn('   Example: postgresql://username:password@host.neon.tech/dbname?sslmode=require');
} else {
  console.log('✅ DATABASE_URL found:', databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
}

// Ensure Prisma client is generated
const prismaClientPath = path.join(__dirname, '../node_modules/.prisma/client');
if (fs.existsSync(prismaClientPath)) {
  console.log('✅ Prisma client found');
} else {
  console.log('📦 Prisma client not found, will be generated during build');
}

console.log('✅ Neon PostgreSQL setup completed');