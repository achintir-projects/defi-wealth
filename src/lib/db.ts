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

// Check if we're using a production database
const isProductionDb = process.env.DATABASE_URL?.includes('neon.tech') || 
                      process.env.DATABASE_URL?.includes('supabase.co') ||
                      process.env.DATABASE_URL?.includes('planetscale.com') ||
                      process.env.DATABASE_URL?.includes('postgresql://') ||
                      process.env.DATABASE_URL?.includes('mysql://')

// Use the configured database URL
let databaseUrl = process.env.DATABASE_URL

// For local development, default to SQLite if no DATABASE_URL is provided
if (!databaseUrl && !isServerless) {
  databaseUrl = 'file:./dev.db'
}

// For serverless environments, require a proper database URL
if (isServerless && !databaseUrl) {
  console.warn('WARNING: No DATABASE_URL provided for serverless environment. Using fallback SQLite (not recommended for production)')
  databaseUrl = 'file:./dev.db'
}

let db: PrismaClient

if (isServerless || isProductionDb) {
  // For serverless or production environments, use the configured database URL
  
  console.log('Using production database configuration:', {
    environment: isServerless ? 'serverless' : 'production',
    databaseUrl: databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Hide credentials
  })
  
  // Configure Prisma for serverless environments
  db = new PrismaClient({
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
} else {
  // For local development with SQLite
  db = globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query'],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
}

export { db }