const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

// Try to initialize Prisma, fallback to in-memory
try {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: 'postgresql://neondb_owner:npg_wXTnomgL35AS@ep-dry-boat-ad6qzm6q-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
      }
    }
  })
} catch (error) {
  console.log('Failed to initialize Prisma, using in-memory fallback:', error.message)
  prisma = null
}

// Helper function to create response
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers
    },
    body: JSON.stringify(body)
  }
}

// Main handler
exports.handler = async (event, context) => {
  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  try {
    // Test database connection
    if (prisma) {
      try {
        await prisma.$queryRaw`SELECT 1`
        return createResponse(200, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          mode: 'database'
        })
      } catch (dbError) {
        console.log('Database connection failed, using in-memory mode:', dbError.message)
      }
    }

    // In-memory fallback
    return createResponse(200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'in-memory',
      mode: 'fallback'
    })

  } catch (error) {
    console.error('Health API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}