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
    const method = event.httpMethod

    if (method === 'POST') {
      // Get all tokens from database
      const tokens = await prisma.token.findMany()

      // Mock price updates (in real app, this would fetch from external API)
      const updatedTokens = await Promise.all(tokens.map(async (token) => {
        // Generate random price change between -5% to +5%
        const priceChangePercent = (Math.random() - 0.5) * 0.1
        const newPrice = token.marketPrice * (1 + priceChangePercent)
        
        // Update token price
        const updatedToken = await prisma.token.update({
          where: { id: token.id },
          data: {
            marketPrice: newPrice,
            displayPrice: `$${newPrice.toFixed(2)}`
          }
        })

        return {
          symbol: updatedToken.symbol,
          oldPrice: token.marketPrice,
          newPrice: updatedToken.marketPrice,
          changePercent: priceChangePercent * 100
        }
      }))

      return createResponse(200, {
        success: true,
        message: 'Prices refreshed successfully',
        updatedTokens: updatedTokens.length,
        updates: updatedTokens
      })
    }

    return createResponse(405, { error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin Refresh Prices API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}