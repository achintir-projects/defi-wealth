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

// Helper function to initialize portfolio with default tokens
async function initializePortfolio(userId, walletAddress) {
  const defaultTokens = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      decimals: 8,
      marketPrice: 45000,
      displayPrice: 45000,
      displayType: 'fiat'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      decimals: 18,
      marketPrice: 3000,
      displayPrice: 3000,
      displayType: 'fiat'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
      decimals: 6,
      marketPrice: 1,
      displayPrice: 1,
      displayType: 'fiat'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
      decimals: 6,
      marketPrice: 1,
      displayPrice: 1,
      displayType: 'fiat'
    },
    {
      symbol: 'BNB',
      name: 'Binance Coin',
      logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
      decimals: 18,
      marketPrice: 400,
      displayPrice: 400,
      displayType: 'fiat'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
      decimals: 9,
      marketPrice: 100,
      displayPrice: 100,
      displayType: 'fiat'
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png',
      decimals: 6,
      marketPrice: 0.5,
      displayPrice: 0.5,
      displayType: 'fiat'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png',
      decimals: 10,
      marketPrice: 7,
      displayPrice: 7,
      displayType: 'fiat'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png',
      decimals: 18,
      marketPrice: 0.8,
      displayPrice: 0.8,
      displayType: 'fiat'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Yellow.png',
      decimals: 18,
      marketPrice: 35,
      displayPrice: 35,
      displayType: 'fiat'
    },
    {
      symbol: 'ATOM',
      name: 'Cosmos',
      logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
      decimals: 6,
      marketPrice: 10,
      displayPrice: 10,
      displayType: 'fiat'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink_new_logo.png',
      decimals: 18,
      marketPrice: 14,
      displayPrice: 14,
      displayType: 'fiat'
    }
  ]

  const defaultBalances = [
    { symbol: 'BTC', displayBalance: 2.5, actualBalance: 0 },
    { symbol: 'ETH', displayBalance: 15.8, actualBalance: 0 },
    { symbol: 'USDT', displayBalance: 50000, actualBalance: 0 },
    { symbol: 'USDC', displayBalance: 25000, actualBalance: 0 },
    { symbol: 'BNB', displayBalance: 125, actualBalance: 0 },
    { symbol: 'SOL', displayBalance: 450, actualBalance: 0 },
    { symbol: 'ADA', displayBalance: 25000, actualBalance: 0 },
    { symbol: 'DOT', displayBalance: 1200, actualBalance: 0 },
    { symbol: 'MATIC', displayBalance: 12000, actualBalance: 0 },
    { symbol: 'AVAX', displayBalance: 850, actualBalance: 0 },
    { symbol: 'ATOM', displayBalance: 200, actualBalance: 0 },
    { symbol: 'LINK', displayBalance: 650, actualBalance: 0 }
  ]

  // Create default tokens if they don't exist
  for (const tokenData of defaultTokens) {
    await prisma.token.upsert({
      where: { symbol: tokenData.symbol },
      update: tokenData,
      create: tokenData
    })
  }

  // Create user token balances
  for (const balanceData of defaultBalances) {
    await prisma.userTokenBalance.create({
      data: {
        userId,
        tokenSymbol: balanceData.symbol,
        displayBalance: balanceData.displayBalance,
        actualBalance: balanceData.actualBalance
      }
    })
  }
}

// Helper function to ensure admin user exists
async function ensureAdminUser() {
  let adminUser = await prisma.user.findUnique({
    where: { id: 'admin-user-id' }
  })

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        id: 'admin-user-id',
        email: 'admin@defi-wealth.com',
        name: 'System Administrator',
        role: 'admin',
        walletAddress: '0x0000000000000000000000000000000000000000'
      }
    })
    console.log('Admin user created:', adminUser.id)
  }

  return adminUser
}

// Helper function to parse request body
async function parseRequestBody(event) {
  if (!event.body) return {}
  
  try {
    return JSON.parse(event.body)
  } catch (error) {
    return {}
  }
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
    // Ensure admin user exists for the system
    try {
      await ensureAdminUser()
    } catch (adminError) {
      console.log('Could not ensure admin user:', adminError)
    }

    // Get wallet address from query parameters
    const { address } = event.queryStringParameters || {}
    
    if (!address) {
      return createResponse(400, { error: 'Wallet address is required' })
    }

    // Check if database is available
    try {
      // Find user by wallet address
      let user = await prisma.user.findUnique({
        where: { walletAddress: address }
      })

      // If user doesn't exist, create them
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `user-${address.substring(0, 8)}@defi-wealth.com`,
            walletAddress: address,
            role: 'USER'
          }
        })
        
        // Initialize portfolio with default tokens for new users
        await initializePortfolio(user.id, user.walletAddress || address)
      }

      // Get user's token balances
      const userBalances = await prisma.userTokenBalance.findMany({
        where: { userId: user.id },
        include: {
          token: true,
          user: {
            select: {
              role: true,
              walletAddress: true
            }
          }
        }
      })

      // If user has no balances (shouldn't happen after initialization, but just in case)
      if (userBalances.length === 0) {
        await initializePortfolio(user.id, user.walletAddress || address)
        // Try fetching balances again
        const updatedBalances = await prisma.userTokenBalance.findMany({
          where: { userId: user.id },
          include: {
            token: true,
            user: {
              select: {
                role: true,
                walletAddress: true
              }
            }
          }
        })
        
        if (updatedBalances.length === 0) {
          return createResponse(200, {
            totalValue: 0,
            totalChange24h: 0,
            tokens: [],
            user: {
              role: user.role,
              walletAddress: user.walletAddress
            }
          })
        }
        
        // Use the updated balances
        userBalances.splice(0, userBalances.length, ...updatedBalances)
      }

      const isAdmin = user.role === 'ADMIN'
      
      // Calculate portfolio totals
      let totalValue = 0
      let totalChange24h = 0
      
      const tokens = userBalances.map(balance => {
        const token = balance.token
        
        // Use mock price data for serverless environment
        const currentPrice = token.marketPrice
        const change24h = Math.random() * 10 - 2 // Random change between -2% and +8%
        
        // For display purposes
        const price = currentPrice
        const balanceAmount = isAdmin && token.displayType === 'market' ? balance.actualBalance : balance.displayBalance
        const value = balanceAmount * price
        
        totalValue += value
        totalChange24h += change24h
        
        return {
          symbol: token.symbol,
          name: token.name,
          logo: token.logo,
          balance: balanceAmount,
          price: price,
          value: value,
          change24h: change24h,
          decimals: token.decimals,
          // Include mock market data
          marketCap: currentPrice * 1000000, // Mock market cap
          volume24h: currentPrice * 100000, // Mock volume
          lastUpdated: new Date().toISOString(),
          // Include admin-only data
          ...(isAdmin && {
            marketPrice: token.marketPrice,
            displayPrice: token.displayPrice,
            actualBalance: balance.actualBalance,
            displayBalance: balance.displayBalance,
            displayType: token.displayType
          })
        }
      })

      const portfolio = {
        totalValue,
        totalChange24h: totalChange24h / tokens.length,
        tokens,
        user: {
          role: user.role,
          walletAddress: user.walletAddress
        }
      }

      return createResponse(200, portfolio)
    } catch (dbError) {
      console.log('Database not available, using fallback data:', dbError)
      // Return empty portfolio for serverless environments
      return createResponse(200, {
        totalValue: 0,
        totalChange24h: 0,
        tokens: [],
        user: {
          role: 'USER',
          walletAddress: address
        }
      })
    }
  } catch (error) {
    console.error('Wallet API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}