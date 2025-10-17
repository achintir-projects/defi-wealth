const { PrismaClient } = require('@prisma/client');

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

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Ensure admin user and tokens exist
    try {
      await ensureAdminUser()
      await ensureTokens()
    } catch (initError) {
      console.log('Could not initialize admin user or tokens:', initError)
    }

    const pathParts = event.path.split('/');
    const address = pathParts[pathParts.length - 1];
    const action = pathParts[pathParts.length - 2];

    if (event.httpMethod === 'GET') {
      const user = await prisma.user.findUnique({
        where: { walletAddress: address },
        include: {
          tokenBalances: {
            include: {
              token: true
            }
          },
          transfersSent: {
            include: {
              toUser: true,
              token: true
            }
          },
          transfersReceived: {
            include: {
              fromUser: true,
              token: true
            }
          }
        }
      });

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Wallet not found'
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          wallet: user
        })
      };
    }

    if (event.httpMethod === 'POST' && (action === 'flag' || action === 'liquidate')) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: address }
      });

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Wallet not found'
          })
        };
      }

      if (action === 'flag') {
        const { flagReason } = JSON.parse(event.body);
        
        const updatedUser = await prisma.user.update({
          where: { walletAddress: address },
          data: {
            isFlagged: true,
            flagReason: flagReason || 'Flagged by admin'
          }
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Wallet flagged successfully',
            wallet: updatedUser
          })
        };
      }

      if (action === 'liquidate') {
        // Mark all token balances as liquidated
        await prisma.userTokenBalance.updateMany({
          where: { userId: user.id },
          data: {
            actualBalance: 0,
            displayBalance: 0
          }
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Wallet liquidated successfully'
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('Admin wallet detail endpoint error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};