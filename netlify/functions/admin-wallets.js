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

// Helper function to ensure tokens exist
async function ensureTokens() {
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
}
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
    
    // Verify admin authentication from headers
    const adminId = event.headers['x-admin-id'] || event.headers['X-Admin-Id']
    if (!adminId || adminId !== 'admin-user-id') {
      return createResponse(401, { error: 'Unauthorized' })
    }

    // Ensure admin user and tokens exist
    try {
      await ensureAdminUser()
      await ensureTokens()
    } catch (initError) {
      console.log('Could not initialize admin user or tokens:', initError)
    }

    if (method === 'GET') {
      // Get all users with their wallet information
      const users = await prisma.user.findMany({
        include: {
          tokenBalances: {
            include: {
              token: true
            }
          },
          sentTransfers: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          },
          receivedTransfers: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Transform user data to wallet info format
      const wallets = users.map(user => {
        const totalValue = user.tokenBalances.reduce((sum, balance) => {
          return sum + (balance.displayBalance * balance.token.displayPrice)
        }, 0)

        const transferCount = (user.sentTransfers?.length || 0) + (user.receivedTransfers?.length || 0)
        const lastActivity = user.sentTransfers?.[0]?.createdAt || 
                            user.receivedTransfers?.[0]?.createdAt || 
                            user.createdAt

        return {
          id: user.id,
          walletAddress: user.walletAddress,
          email: user.email,
          createdAt: user.createdAt,
          lastActivity: lastActivity,
          totalValue: totalValue,
          tokenCount: user.tokenBalances.length,
          transferCount: transferCount,
          isFlagged: user.isFlagged || false,
          flagReason: user.flagReason
        }
      })

      return createResponse(200, { wallets })
    }

    return createResponse(405, { error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin Wallets API Error:', error)
    return createResponse(500, { error: 'Failed to fetch wallets' })
  }
}