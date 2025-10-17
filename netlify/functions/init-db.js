const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: 'file:./prisma/db/custom.db'
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
    console.log('Initializing database...')
    
    // Check if admin user exists
    let adminUser = await prisma.user.findUnique({
      where: { id: 'admin-user-id' }
    })

    if (!adminUser) {
      console.log('Creating admin user...')
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

    // Check if tokens exist, if not create them
    const tokens = [
      { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400', decimals: 8, marketPrice: 45000, displayPrice: 45000 },
      { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628', decimals: 18, marketPrice: 3000, displayPrice: 3000 },
      { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661', decimals: 6, marketPrice: 1, displayPrice: 1 },
      { symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970', decimals: 18, marketPrice: 400, displayPrice: 400 },
      { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756', decimals: 9, marketPrice: 100, displayPrice: 100 },
      { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090', decimals: 6, marketPrice: 0.5, displayPrice: 0.5 },
      { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150', decimals: 10, marketPrice: 7, displayPrice: 7 },
      { symbol: 'XRP', name: 'Ripple', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442', decimals: 6, marketPrice: 0.6, displayPrice: 0.6 },
      { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449', decimals: 8, marketPrice: 0.08, displayPrice: 0.08 },
      { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360', decimals: 18, marketPrice: 35, displayPrice: 35 },
    ]

    for (const tokenData of tokens) {
      const existingToken = await prisma.token.findUnique({
        where: { symbol: tokenData.symbol }
      })

      if (!existingToken) {
        await prisma.token.create({
          data: tokenData
        })
        console.log(`Created token: ${tokenData.symbol}`)
      }
    }

    // Create a demo user with initial portfolio
    const demoWalletAddress = '0x826e54c2cb90ba7bbbab853f177838b934104379'
    let demoUser = await prisma.user.findUnique({
      where: { walletAddress: demoWalletAddress }
    })

    if (!demoUser) {
      console.log('Creating demo user...')
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@defi-wealth.com',
          walletAddress: demoWalletAddress,
          role: 'user'
        }
      })

      // Create initial token balances for demo user
      const demoBalances = [
        { symbol: 'BTC', displayBalance: 2.5, actualBalance: 0 },
        { symbol: 'ETH', displayBalance: 15.8, actualBalance: 0 },
        { symbol: 'USDT', displayBalance: 50000, actualBalance: 0 },
        { symbol: 'BNB', displayBalance: 125, actualBalance: 0 },
        { symbol: 'SOL', displayBalance: 450, actualBalance: 0 },
        { symbol: 'ADA', displayBalance: 25000, actualBalance: 0 },
        { symbol: 'DOT', displayBalance: 1200, actualBalance: 0 },
        { symbol: 'XRP', displayBalance: 50000, actualBalance: 0 },
        { symbol: 'DOGE', displayBalance: 100000, actualBalance: 0 },
        { symbol: 'AVAX', displayBalance: 850, actualBalance: 0 },
      ]

      for (const balanceData of demoBalances) {
        await prisma.userTokenBalance.create({
          data: {
            userId: demoUser.id,
            tokenSymbol: balanceData.symbol,
            displayBalance: balanceData.displayBalance,
            actualBalance: balanceData.actualBalance
          }
        })
      }

      console.log('Demo user created with initial portfolio')
    }

    console.log('Database initialization completed successfully!')

    return createResponse(200, {
      message: 'Database initialized successfully',
      adminUser: {
        id: adminUser.id,
        email: adminUser.email
      },
      demoUser: {
        id: demoUser.id,
        walletAddress: demoUser.walletAddress
      },
      tokensCreated: tokens.length
    })

  } catch (error) {
    console.error('Database initialization error:', error)
    return createResponse(500, { 
      error: 'Failed to initialize database',
      details: error.message 
    })
  }
}