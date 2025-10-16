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
    
    // Verify admin authentication from headers
    const adminId = event.headers['x-admin-id'] || event.headers['X-Admin-Id']
    if (!adminId || adminId !== 'admin-user-id') {
      return createResponse(401, { error: 'Unauthorized' })
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