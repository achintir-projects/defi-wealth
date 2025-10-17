const { PrismaClient } = require('@prisma/client')

// Initialize Prisma client for serverless environment
let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./prisma/db/custom.db'
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
    // Ensure admin user and tokens exist
    try {
      await ensureAdminUser()
      await ensureTokens()
    } catch (initError) {
      console.log('Could not initialize admin user or tokens:', initError)
    }

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