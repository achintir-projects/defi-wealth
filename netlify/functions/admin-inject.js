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
      ...headers
    },
    body: JSON.stringify(body)
  }
}

// Main handler
exports.handler = async (event, context) => {
  try {
    const method = event.httpMethod

    if (method === 'GET') {
      // Get injection history
      const injections = await prisma.transfer.findMany({
        where: {
          fromUserId: { not: null },
          metadata: {
            path: ['type'],
            equals: 'admin_injection'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      // Get related user and token data
      const userIds = injections.map(i => i.fromUserId).filter(Boolean)
      const toUserIds = injections.map(i => i.toUserId).filter(Boolean)
      const tokenSymbols = [...new Set(injections.map(i => i.tokenSymbol))]

      const [users, toUsers, tokens] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, walletAddress: true }
        }),
        prisma.user.findMany({
          where: { id: { in: toUserIds } },
          select: { id: true, email: true, walletAddress: true }
        }),
        prisma.token.findMany({
          where: { symbol: { in: tokenSymbols } },
          select: { id: true, symbol: true, name: true, logo: true }
        })
      ])

      const injectionHistory = injections.map(injection => {
        const admin = users.find(u => u.id === injection.fromUserId)
        const user = toUsers.find(u => u.id === injection.toUserId)
        const token = tokens.find(t => t.symbol === injection.tokenSymbol)

        return {
          id: injection.id,
          adminEmail: admin?.email || 'Unknown',
          userWallet: user?.walletAddress || 'Unknown',
          tokenSymbol: injection.tokenSymbol,
          tokenName: token?.name || injection.tokenSymbol,
          tokenLogo: token?.logo || '',
          amount: injection.amount,
          timestamp: injection.createdAt,
          txHash: injection.txHash
        }
      })

      return createResponse(200, injectionHistory)
    }

    if (method === 'POST') {
      // Handle token injection
      const body = await parseRequestBody(event)
      const { walletAddress, tokenSymbol, amount } = body

      if (!walletAddress || !tokenSymbol || !amount) {
        return createResponse(400, { error: 'Missing required fields' })
      }

      // Find user by wallet address
      const user = await prisma.user.findUnique({
        where: { walletAddress }
      })

      if (!user) {
        return createResponse(404, { error: 'User not found' })
      }

      // Find token
      const token = await prisma.token.findUnique({
        where: { symbol: tokenSymbol }
      })

      if (!token) {
        return createResponse(404, { error: 'Token not found' })
      }

      // Update user's token balance
      const updatedBalance = await prisma.userTokenBalance.upsert({
        where: {
          userId_tokenSymbol: {
            userId: user.id,
            tokenSymbol
          }
        },
        update: {
          displayBalance: {
            increment: amount
          },
          actualBalance: {
            increment: amount
          }
        },
        create: {
          userId: user.id,
          tokenSymbol,
          displayBalance: amount,
          actualBalance: amount
        }
      })

      // Create transfer record
      const transfer = await prisma.transfer.create({
        data: {
          fromUserId: user.id,
          fromAddress: '0x0000000000000000000000000000000000000000', // System address
          toUserId: user.id,
          toAddress: walletAddress,
          tokenSymbol,
          amount,
          status: 'completed',
          txHash: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            type: 'admin_injection',
            adminId: user.id,
            timestamp: new Date().toISOString()
          }
        }
      })

      return createResponse(200, {
        success: true,
        message: 'Token injection completed successfully',
        transfer: {
          id: transfer.id,
          tokenSymbol: transfer.tokenSymbol,
          amount: transfer.amount,
          timestamp: transfer.createdAt
        }
      })
    }

    return createResponse(405, { error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin Inject API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}