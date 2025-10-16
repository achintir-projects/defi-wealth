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
    // Create demo user if not exists
    const demoUser = await prisma.user.upsert({
      where: { walletAddress: '0x826e54c2cb90ba7bbbab853f177838b934104379' },
      update: {},
      create: {
        email: 'demo@example.com',
        name: 'Demo User',
        walletAddress: '0x826e54c2cb90ba7bbbab853f177838b934104379',
        role: 'USER'
      }
    });

    // Create demo tokens if not exist
    const tokens = [
      { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', decimals: 8, marketPrice: 45000, displayPrice: 45000, displayType: 'fiat' },
      { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', decimals: 18, marketPrice: 3000, displayPrice: 3000, displayType: 'fiat' },
      { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png', decimals: 6, marketPrice: 1, displayPrice: 1, displayType: 'fiat' },
      { symbol: 'USDC', name: 'USD Coin', logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', decimals: 6, marketPrice: 1, displayPrice: 1, displayType: 'fiat' },
      { symbol: 'BNB', name: 'Binance Coin', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', decimals: 18, marketPrice: 400, displayPrice: 400, displayType: 'fiat' },
      { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', decimals: 9, marketPrice: 100, displayPrice: 100, displayType: 'fiat' },
      { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png', decimals: 6, marketPrice: 0.5, displayPrice: 0.5, displayType: 'fiat' },
      { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot-new.png', decimals: 10, marketPrice: 7, displayPrice: 7, displayType: 'fiat' },
      { symbol: 'MATIC', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png', decimals: 18, marketPrice: 0.8, displayPrice: 0.8, displayType: 'fiat' },
      { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Yellow.png', decimals: 18, marketPrice: 35, displayPrice: 35, displayType: 'fiat' },
      { symbol: 'ATOM', name: 'Cosmos', logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png', decimals: 6, marketPrice: 10, displayPrice: 10, displayType: 'fiat' },
      { symbol: 'LINK', name: 'Chainlink', logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png', decimals: 18, marketPrice: 14, displayPrice: 14, displayType: 'fiat' }
    ];

    for (const token of tokens) {
      await prisma.token.upsert({
        where: { symbol: token.symbol },
        update: {},
        create: token
      });
    }

    // Create demo balances
    const demoBalances = [
      { tokenSymbol: 'BTC', actualBalance: 0.5, displayBalance: 0.5 },
      { tokenSymbol: 'ETH', actualBalance: 5, displayBalance: 5 },
      { tokenSymbol: 'USDT', actualBalance: 10000, displayBalance: 10000 },
      { tokenSymbol: 'USDC', actualBalance: 5000, displayBalance: 5000 },
      { tokenSymbol: 'BNB', actualBalance: 10, displayBalance: 10 },
      { tokenSymbol: 'SOL', actualBalance: 50, displayBalance: 50 },
      { tokenSymbol: 'ADA', actualBalance: 10000, displayBalance: 10000 },
      { tokenSymbol: 'DOT', actualBalance: 500, displayBalance: 500 },
      { tokenSymbol: 'MATIC', actualBalance: 10000, displayBalance: 10000 },
      { tokenSymbol: 'AVAX', actualBalance: 100, displayBalance: 100 },
      { tokenSymbol: 'ATOM', actualBalance: 200, displayBalance: 200 },
      { tokenSymbol: 'LINK', actualBalance: 300, displayBalance: 300 }
    ];

    for (const balance of demoBalances) {
      await prisma.userTokenBalance.upsert({
        where: {
          userId_tokenSymbol: {
            userId: demoUser.id,
            tokenSymbol: balance.tokenSymbol
          }
        },
        update: {},
        create: {
          userId: demoUser.id,
          tokenSymbol: balance.tokenSymbol,
          actualBalance: balance.actualBalance,
          displayBalance: balance.displayBalance
        }
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: true,
        message: 'Demo data initialized successfully',
        user: demoUser,
        tokensCount: tokens.length,
        balancesCount: demoBalances.length
      })
    };
  } catch (error) {
    console.error('Demo initialization failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};