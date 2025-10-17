const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

// In-memory fallback data for serverless environment
const inMemoryUsers = new Map()
const inMemoryTokens = new Map()
const inMemoryBalances = new Map()
const inMemoryTransfers = new Map()

// Initialize default tokens
function initializeDefaultTokens() {
  const defaultTokens = [
    { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', decimals: 8, marketPrice: 45000, displayPrice: 45000 },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', decimals: 18, marketPrice: 3000, displayPrice: 3000 },
    { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png', decimals: 6, marketPrice: 1, displayPrice: 1 },
    { symbol: 'USDC', name: 'USD Coin', logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', decimals: 6, marketPrice: 1, displayPrice: 1 },
    { symbol: 'BNB', name: 'Binance Coin', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', decimals: 18, marketPrice: 400, displayPrice: 400 },
    { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', decimals: 9, marketPrice: 100, displayPrice: 100 },
    { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png', decimals: 6, marketPrice: 0.5, displayPrice: 0.5 },
    { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png', decimals: 10, marketPrice: 7, displayPrice: 7 },
    { symbol: 'MATIC', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png', decimals: 18, marketPrice: 0.8, displayPrice: 0.8 },
    { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Yellow.png', decimals: 18, marketPrice: 35, displayPrice: 35 }
  ]

  defaultTokens.forEach(token => {
    inMemoryTokens.set(token.symbol, token)
  })
}

// Initialize default balances for a user
function initializeUserBalances(userId, walletAddress) {
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
    { symbol: 'AVAX', displayBalance: 850, actualBalance: 0 }
  ]

  const userBalances = new Map()
  defaultBalances.forEach(balance => {
    const balanceId = `${userId}_${balance.symbol}`
    userBalances.set(balanceId, {
      userId,
      tokenSymbol: balance.symbol,
      actualBalance: balance.actualBalance,
      displayBalance: balance.displayBalance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  })

  inMemoryBalances.set(userId, userBalances)
  return userBalances
}

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

// Helper function to get or create user (in-memory)
function getOrCreateUser(walletAddress) {
  let user = inMemoryUsers.get(walletAddress)
  
  if (!user) {
    user = {
      id: `user_${walletAddress.substring(0, 8)}`,
      email: `user-${walletAddress.substring(0, 8)}@defi-wealth.com`,
      walletAddress,
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    inMemoryUsers.set(walletAddress, user)
    
    // Initialize default tokens for new user
    initializeUserBalances(user.id, walletAddress)
  }
  
  return user
}

// Helper function to get user balances (in-memory)
function getUserBalances(userId) {
  return inMemoryBalances.get(userId) || new Map()
}

// Main handler
exports.handler = async (event, context) => {
  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  try {
    // Initialize default tokens if not already done
    if (inMemoryTokens.size === 0) {
      initializeDefaultTokens()
    }

    // Get wallet address from query parameters
    const { address } = event.queryStringParameters || {}
    
    if (!address) {
      return createResponse(400, { error: 'Wallet address is required' })
    }

    // Try to use Prisma first, fallback to in-memory
    if (prisma) {
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
              role: 'user'
            }
          })
          
          // Initialize portfolio with default tokens
          const defaultTokens = Array.from(inMemoryTokens.values())
          for (const tokenData of defaultTokens) {
            await prisma.token.upsert({
              where: { symbol: tokenData.symbol },
              update: tokenData,
              create: tokenData
            })
          }
          
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
            { symbol: 'AVAX', displayBalance: 850, actualBalance: 0 }
          ]
          
          for (const balanceData of defaultBalances) {
            await prisma.userTokenBalance.create({
              data: {
                userId: user.id,
                tokenSymbol: balanceData.symbol,
                displayBalance: balanceData.displayBalance,
                actualBalance: balanceData.actualBalance
              }
            })
          }
        }

        // Get user's token balances
        const userBalances = await prisma.userTokenBalance.findMany({
          where: { userId: user.id },
          include: {
            token: true
          }
        })

        // Calculate portfolio totals
        let totalValue = 0
        let totalChange24h = 0
        
        const tokens = userBalances.map(balance => {
          const token = balance.token
          const currentPrice = token.marketPrice
          const change24h = Math.random() * 10 - 2 // Random change between -2% and +8%
          const balanceAmount = balance.displayBalance
          const value = balanceAmount * currentPrice
          
          totalValue += value
          totalChange24h += change24h
          
          return {
            symbol: token.symbol,
            name: token.name,
            logo: token.logo,
            balance: balanceAmount,
            price: currentPrice,
            value: value,
            change24h: change24h,
            decimals: token.decimals,
            marketCap: currentPrice * 1000000,
            volume24h: currentPrice * 100000,
            lastUpdated: new Date().toISOString()
          }
        })

        return createResponse(200, {
          totalValue,
          totalChange24h: totalChange24h / tokens.length,
          tokens,
          user: {
            role: user.role,
            walletAddress: user.walletAddress
          }
        })

      } catch (dbError) {
        console.log('Database error, falling back to in-memory:', dbError.message)
        // Fall back to in-memory implementation
      }
    }

    // In-memory implementation (fallback)
    const user = getOrCreateUser(address)
    const userBalancesMap = getUserBalances(user.id)
    
    // Calculate portfolio totals
    let totalValue = 0
    let totalChange24h = 0
    const tokens = []
    
    for (const [balanceId, balance] of userBalancesMap) {
      const token = inMemoryTokens.get(balance.tokenSymbol)
      if (token) {
        const currentPrice = token.marketPrice
        const change24h = Math.random() * 10 - 2 // Random change between -2% and +8%
        const balanceAmount = balance.displayBalance
        const value = balanceAmount * currentPrice
        
        totalValue += value
        totalChange24h += change24h
        
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          logo: token.logo,
          balance: balanceAmount,
          price: currentPrice,
          value: value,
          change24h: change24h,
          decimals: token.decimals,
          marketCap: currentPrice * 1000000,
          volume24h: currentPrice * 100000,
          lastUpdated: new Date().toISOString()
        })
      }
    }

    return createResponse(200, {
      totalValue,
      totalChange24h: tokens.length > 0 ? totalChange24h / tokens.length : 0,
      tokens,
      user: {
        role: user.role,
        walletAddress: user.walletAddress
      }
    })

  } catch (error) {
    console.error('Wallet API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}