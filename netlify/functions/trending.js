const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
} else {
  prisma = new PrismaClient({
    log: ['query'],
  })
}

// Helper function to create response
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  }
}

// Main handler
exports.handler = async (event, context) => {
  try {
    // Get all tokens from database
    const tokens = await prisma.token.findMany({
      orderBy: { marketPrice: 'desc' }
    })

    // Format trending data
    const trendingData = tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      marketPrice: token.marketPrice,
      displayPrice: token.displayPrice,
      displayType: token.displayType,
      priceChange24h: Math.random() * 10 - 5, // Mock price change
      volume24h: Math.random() * 1000000, // Mock volume
      marketCap: token.marketPrice * (Math.random() * 10000000 + 1000000) // Mock market cap
    }))

    return createResponse(200, trendingData)
  } catch (error) {
    console.error('Trending API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}