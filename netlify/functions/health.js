const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./db/custom.db'
    }
  }
});

exports.handler = async (event, context) => {
  try {
    // Simple health check - try to connect to the database
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected'
      })
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      })
    };
  }
};