const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: 'file:/tmp/custom.db'
    }
  }
})

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
    try {
      await prisma.$queryRaw`SELECT 1`
      return createResponse(200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    } catch (dbError) {
      return createResponse(200, {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: dbError.message
      })
    }
  } catch (error) {
    console.error('Health API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}