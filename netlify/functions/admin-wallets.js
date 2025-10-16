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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          wallets: users,
          totalWallets: users.length
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
    console.error('Admin wallets endpoint error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};