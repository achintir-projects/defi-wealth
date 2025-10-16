import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're in a serverless environment (like Netlify, Vercel)
const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT

// Check if we're using a production database
const isProductionDb = process.env.DATABASE_URL?.includes('neon.tech') || 
                      process.env.DATABASE_URL?.includes('supabase.co') ||
                      process.env.DATABASE_URL?.includes('planetscale.com')

let db: PrismaClient

if (isServerless || isProductionDb) {
  // For serverless or production environments, use the configured database URL
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  
  console.log('Using production database configuration:', {
    environment: isServerless ? 'serverless' : 'production',
    databaseUrl: databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') // Hide credentials
  })
  
  db = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })
} else {
  // For local development with SQLite
  db = globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query'],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
}

export { db }