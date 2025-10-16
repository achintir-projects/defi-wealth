const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./db/custom.db'
    }
  }
});

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