const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./db/custom.db'
      }
    }
  })
} else {
  prisma = new PrismaClient({
    log: ['query'],
  })
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
      return createResponse(401, { error: 'Unauthorized: Admin access required' })
    }

    // Ensure admin user and tokens exist
    try {
      await ensureAdminUser()
      await ensureTokens()
    } catch (initError) {
      console.log('Could not initialize admin user or tokens:', initError)
    }

    if (method === 'GET') {
      // Get injection history
      const adminUser = await prisma.user.findUnique({
        where: { id: adminId }
      })

      if (!adminUser || adminUser.role !== 'admin') {
        return createResponse(403, { error: 'Unauthorized: Admin privileges required' })
      }

      const allTransfers = await prisma.transfer.findMany({
        where: {
          fromUserId: adminId
        },
        include: {
          toUser: {
            select: {
              id: true,
              email: true,
              walletAddress: true
            }
          },
          token: {
            select: {
              symbol: true,
              name: true,
              logo: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      })

      // Filter for admin injections
      const injections = allTransfers.filter(transfer => {
        const metadata = transfer.metadata || {}
        return metadata.type === 'admin_injection'
      })

      // Format injections for response
      const formattedInjections = injections.map(injection => ({
        id: injection.id,
        toWallet: injection.toAddress,
        toUser: injection.toUser,
        tokenSymbol: injection.tokenSymbol,
        tokenName: injection.token.name,
        tokenLogo: injection.token.logo,
        amount: injection.amount,
        message: (injection.metadata && injection.metadata.message) || 'Admin token injection',
        txHash: injection.txHash,
        createdAt: injection.createdAt,
        injectedBy: (injection.metadata && injection.metadata.injectedBy) || undefined
      }))

      return createResponse(200, formattedInjections)
    }

    if (method === 'POST') {
      // Handle token injection
      const body = await parseRequestBody(event)
      const { walletAddress, tokenSymbol, amount, message } = body

      if (!walletAddress || !tokenSymbol || !amount) {
        return createResponse(400, { error: 'Missing required fields' })
      }

      // Verify admin user
      const adminUser = await prisma.user.findUnique({
        where: { id: adminId }
      })

      if (!adminUser || adminUser.role !== 'admin') {
        return createResponse(403, { error: 'Unauthorized: Admin privileges required' })
      }

      // Find or create the target user by wallet address
      let targetUser = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!targetUser) {
        targetUser = await prisma.user.create({
          data: {
            email: `user-${walletAddress.substring(0, 8)}@defi-wealth.com`,
            walletAddress,
            role: 'user'
          }
        })
      }

      // Verify the token exists
      const token = await prisma.token.findUnique({
        where: { symbol: tokenSymbol }
      })

      if (!token) {
        return createResponse(404, { error: 'Token not found' })
      }

      // Generate transaction hash for the injection
      const txHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`

      // Perform the token injection
      await prisma.$transaction(async (tx) => {
        // Update or create user token balance
        await tx.userTokenBalance.upsert({
          where: {
            userId_tokenSymbol: {
              userId: targetUser.id,
              tokenSymbol: tokenSymbol
            }
          },
          update: {
            displayBalance: {
              increment: amount
            },
            actualBalance: {
              increment: amount
            },
            updatedAt: new Date()
          },
          create: {
            userId: targetUser.id,
            tokenSymbol: tokenSymbol,
            displayBalance: amount,
            actualBalance: amount
          }
        })

        // Record the injection as a transfer from admin
        await tx.transfer.create({
          data: {
            fromUserId: adminUser.id,
            fromAddress: adminUser.walletAddress || 'admin',
            toUserId: targetUser.id,
            toAddress: walletAddress,
            tokenSymbol,
            amount,
            status: 'completed',
            txHash,
            metadata: {
              type: 'admin_injection',
              message: message || 'Admin token injection',
              injectedBy: adminUser.id
            }
          }
        })
      })

      return createResponse(200, {
        message: 'Token injection completed successfully',
        injection: {
          toWallet: walletAddress,
          tokenSymbol,
          amount,
          txHash,
          injectedBy: adminUser.id,
          timestamp: new Date().toISOString()
        }
      })
    }

    return createResponse(405, { error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin Inject API Error:', error)
    return createResponse(500, { 
      error: 'Internal server error',
      details: error.message 
    })
  }
}