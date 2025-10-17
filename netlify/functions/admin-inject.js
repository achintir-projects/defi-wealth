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
    { symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', decimals: 18, marketPrice: 400, displayPrice: 400 },
    { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', decimals: 9, marketPrice: 100, displayPrice: 100 },
    { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png', decimals: 6, marketPrice: 0.5, displayPrice: 0.5 },
    { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png', decimals: 10, marketPrice: 7, displayPrice: 7 },
    { symbol: 'XRP', name: 'Ripple', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png', decimals: 6, marketPrice: 0.6, displayPrice: 0.6 },
    { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', decimals: 8, marketPrice: 0.08, displayPrice: 0.08 },
    { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg', decimals: 18, marketPrice: 35, displayPrice: 35 },
  ]

  defaultTokens.forEach(token => {
    inMemoryTokens.set(token.symbol, token)
  })
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
  }
  
  return user
}

// Helper function to get user balances (in-memory)
function getUserBalances(userId) {
  if (!inMemoryBalances.has(userId)) {
    inMemoryBalances.set(userId, new Map())
  }
  return inMemoryBalances.get(userId)
}

// Helper function to update user balance (in-memory)
function updateUserBalance(userId, tokenSymbol, amount) {
  const userBalances = getUserBalances(userId)
  const balanceId = `${userId}_${tokenSymbol}`
  
  let balance = userBalances.get(balanceId)
  if (!balance) {
    balance = {
      userId,
      tokenSymbol,
      actualBalance: 0,
      displayBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    userBalances.set(balanceId, balance)
  }
  
  balance.displayBalance += amount
  balance.actualBalance += amount
  balance.updatedAt = new Date().toISOString()
  
  return balance
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

    const method = event.httpMethod
    
    // Verify admin authentication from headers
    const adminId = event.headers['x-admin-id'] || event.headers['X-Admin-Id']
    if (!adminId || adminId !== 'admin-user-id') {
      return createResponse(401, { error: 'Unauthorized: Admin access required' })
    }

    if (method === 'GET') {
      // Get injection history
      try {
        if (prisma) {
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
      } catch (dbError) {
        console.log('Database error, falling back to in-memory:', dbError.message)
      }

      // In-memory fallback
      const injections = []
      for (const [transferId, transfer] of inMemoryTransfers) {
        if (transfer.fromUserId === 'admin-user-id' && transfer.metadata?.type === 'admin_injection') {
          injections.push({
            id: transfer.id,
            toWallet: transfer.toAddress,
            toUser: { id: transfer.toUserId, walletAddress: transfer.toAddress },
            tokenSymbol: transfer.tokenSymbol,
            tokenName: inMemoryTokens.get(transfer.tokenSymbol)?.name || transfer.tokenSymbol,
            tokenLogo: inMemoryTokens.get(transfer.tokenSymbol)?.logo || '',
            amount: transfer.amount,
            message: transfer.metadata?.message || 'Admin token injection',
            txHash: transfer.txHash,
            createdAt: transfer.createdAt,
            injectedBy: transfer.metadata?.injectedBy
          })
        }
      }

      return createResponse(200, injections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    }

    if (method === 'POST') {
      // Handle token injection
      const body = await parseRequestBody(event)
      const { walletAddress, tokenSymbol, amount, message } = body

      if (!walletAddress || !tokenSymbol || !amount) {
        return createResponse(400, { error: 'Missing required fields' })
      }

      // Try to use Prisma first
      if (prisma) {
        try {
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

        } catch (dbError) {
          console.log('Database error, falling back to in-memory:', dbError.message)
        }
      }

      // In-memory fallback
      const targetUser = getOrCreateUser(walletAddress)
      const token = inMemoryTokens.get(tokenSymbol)
      
      if (!token) {
        return createResponse(404, { error: 'Token not found' })
      }

      // Update user balance
      updateUserBalance(targetUser.id, tokenSymbol, amount)

      // Generate transaction hash
      const txHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`

      // Record the transfer
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const transfer = {
        id: transferId,
        fromUserId: 'admin-user-id',
        fromAddress: '0x0000000000000000000000000000000000000000',
        toUserId: targetUser.id,
        toAddress: walletAddress,
        tokenSymbol,
        amount,
        status: 'completed',
        txHash,
        metadata: {
          type: 'admin_injection',
          message: message || 'Admin token injection',
          injectedBy: 'admin-user-id'
        },
        createdAt: new Date().toISOString()
      }

      inMemoryTransfers.set(transferId, transfer)

      return createResponse(200, {
        message: 'Token injection completed successfully',
        injection: {
          toWallet: walletAddress,
          tokenSymbol,
          amount,
          txHash,
          injectedBy: 'admin-user-id',
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