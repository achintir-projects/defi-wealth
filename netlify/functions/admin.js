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
    const path = event.path.split('/').pop();
    
    switch (path) {
      case 'route':
        // Handle admin route
        if (event.httpMethod === 'GET') {
          const users = await prisma.user.findMany({
            include: {
              tokenBalances: {
                include: {
                  token: true
                }
              },
              transfersSent: true,
              transfersReceived: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          });

          const tokens = await prisma.token.findMany({
            orderBy: {
              symbol: 'asc'
            }
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              users,
              tokens,
              totalUsers: users.length,
              totalTokens: tokens.length
            })
          };
        }
        break;

      case 'wallets':
        // Handle admin wallets route
        if (event.httpMethod === 'GET') {
          const users = await prisma.user.findMany({
            include: {
              tokenBalances: {
                include: {
                  token: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              wallets: users,
              totalWallets: users.length
            })
          };
        }
        break;

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Admin endpoint not found'
          })
        };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('Admin endpoint error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};