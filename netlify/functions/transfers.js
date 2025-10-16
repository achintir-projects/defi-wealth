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

      // Get user's transfers
      const transfers = await prisma.transfer.findMany({
        where: {
          OR: [
            { fromAddress: address },
            { toAddress: address }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      // Get related token data
      const tokenSymbols = [...new Set(transfers.map(t => t.tokenSymbol))]
      const tokens = await prisma.token.findMany({
        where: { symbol: { in: tokenSymbols } },
        select: { id: true, symbol: true, name: true, logo: true }
      })

      const transferHistory = transfers.map(transfer => {
        const token = tokens.find(t => t.symbol === transfer.tokenSymbol)
        
        return {
          id: transfer.id,
          type: transfer.fromAddress === address ? 'sent' : 'received',
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
          tokenSymbol: transfer.tokenSymbol,
          tokenName: token?.name || transfer.tokenSymbol,
          tokenLogo: token?.logo || '',
          amount: transfer.amount,
          status: transfer.status,
          timestamp: transfer.createdAt,
          txHash: transfer.txHash,
          metadata: transfer.metadata
        }
      })

      return createResponse(200, transferHistory)
    }

    if (method === 'POST') {
      // Handle new transfer
      const body = await parseRequestBody(event)
      const { fromAddress, toAddress, tokenSymbol, amount } = body

      if (!fromAddress || !toAddress || !tokenSymbol || !amount) {
        return createResponse(400, { error: 'Missing required fields' })
      }

      // Find users
      const [fromUser, toUser] = await Promise.all([
        prisma.user.findUnique({
          where: { walletAddress: fromAddress }
        }),
        prisma.user.findUnique({
          where: { walletAddress: toAddress }
        })
      ])

      if (!fromUser) {
        return createResponse(404, { error: 'Sender not found' })
      }

      if (!toUser) {
        return createResponse(404, { error: 'Recipient not found' })
      }

      // Find token
      const token = await prisma.token.findUnique({
        where: { symbol: tokenSymbol }
      })

      if (!token) {
        return createResponse(404, { error: 'Token not found' })
      }

      // Check sender balance
      const senderBalance = await prisma.userTokenBalance.findUnique({
        where: {
          userId_tokenSymbol: {
            userId: fromUser.id,
            tokenSymbol
          }
        }
      })

      if (!senderBalance || senderBalance.actualBalance < amount) {
        return createResponse(400, { error: 'Insufficient balance' })
      }

      // Perform transfer
      const [updatedFromBalance, updatedToBalance, transfer] = await Promise.all([
        // Update sender balance
        prisma.userTokenBalance.update({
          where: {
            userId_tokenSymbol: {
              userId: fromUser.id,
              tokenSymbol
            }
          },
          data: {
            displayBalance: {
              decrement: amount
            },
            actualBalance: {
              decrement: amount
            }
          }
        }),

        // Update recipient balance
        prisma.userTokenBalance.upsert({
          where: {
            userId_tokenSymbol: {
              userId: toUser.id,
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
            userId: toUser.id,
            tokenSymbol,
            displayBalance: amount,
            actualBalance: amount
          }
        }),

        // Create transfer record
        prisma.transfer.create({
          data: {
            fromUserId: fromUser.id,
            fromAddress,
            toUserId: toUser.id,
            toAddress,
            tokenSymbol,
            amount,
            status: 'completed',
            txHash: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        })
      ])

      return createResponse(200, {
        success: true,
        message: 'Transfer completed successfully',
        transfer: {
          id: transfer.id,
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
          tokenSymbol: transfer.tokenSymbol,
          amount: transfer.amount,
          timestamp: transfer.createdAt,
          txHash: transfer.txHash
        }
      })
    }

    return createResponse(405, { error: 'Method not allowed' })
  } catch (error) {
    console.error('Transfers API Error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}