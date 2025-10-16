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
    // Get wallet address from query parameters
    const { address } = event.queryStringParameters || {}
    
    if (!address) {
      return createResponse(400, { error: 'Wallet address is required' })
    }

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress: address }
    })

    if (!user) {
      return createResponse(404, { error: 'User not found' })
    }

    // Get user's token balances
    const balances = await prisma.userTokenBalance.findMany({
      where: { userId: user.id }
    })

    // Get token details
    const tokenSymbols = balances.map(b => b.tokenSymbol)
    const tokens = await prisma.token.findMany({
      where: { symbol: { in: tokenSymbols } }
    })

    // Calculate portfolio value
    let totalValue = 0
    const portfolioData = {
      address: user.walletAddress,
      totalValue: 0,
      tokens: balances.map(balance => {
        const token = tokens.find(t => t.symbol === balance.tokenSymbol)
        const tokenValue = balance.displayBalance * (token?.marketPrice || 0)
        totalValue += tokenValue
        
        return {
          symbol: balance.tokenSymbol,
          name: token?.name || balance.tokenSymbol,
          logo: token?.logo || '',
          balance: balance.displayBalance,
          actualBalance: balance.actualBalance,
          marketPrice: token?.marketPrice || 0,
          displayPrice: token?.displayPrice || '$0.00',
          displayType: token?.displayType || 'fiat',
          value: tokenValue,
          displayValue: `$${tokenValue.toFixed(2)}`
        }
      })
    }

    portfolioData.totalValue = totalValue
    portfolioData.displayTotalValue = `$${totalValue.toFixed(2)}`

    return createResponse(200, portfolioData)
  } catch (error) {
    console.error('Portfolio API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}