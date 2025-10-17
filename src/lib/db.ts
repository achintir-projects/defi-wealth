import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're in a serverless environment (like Netlify, Vercel)
const isServerless = process.env.NETLIFY_DEPLOY_URL || 
                      process.env.NETLIFY_SITE_URL || 
                      process.env.VERCEL || 
                      process.env.RAILWAY_ENVIRONMENT || 
                      process.env.AWS_LAMBDA_FUNCTION_NAME

// Use the configured database URL
const databaseUrl = process.env.DATABASE_URL

// Require DATABASE_URL for all environments
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Please configure your Neon PostgreSQL connection string.')
}

let db: PrismaClient

console.log('Using Neon PostgreSQL database:', {
  environment: isServerless ? 'serverless' : 'development',
  databaseUrl: databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Hide credentials
})

// Configure Prisma for optimal performance with Neon PostgreSQL
db = globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })

// Enable connection pooling for better performance in serverless
if (databaseUrl.includes('neon.tech')) {
  // Neon-specific configuration for better serverless performance
  process.env.DATABASE_URL = databaseUrl + '&pgbouncer=true'
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export { db }