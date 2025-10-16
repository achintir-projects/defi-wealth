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
    
    // Verify admin authentication from headers
    const adminId = event.headers['x-admin-id'] || event.headers['X-Admin-Id']
    if (!adminId || adminId !== 'admin-user-id') {
      return createResponse(401, { error: 'Unauthorized: Admin access required' })
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