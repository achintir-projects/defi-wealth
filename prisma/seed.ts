import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { id: 'admin-user-id' },
    update: {},
    create: {
      id: 'admin-user-id',
      email: 'admin@defi-wealth.com',
      name: 'Admin User',
      role: 'admin',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e8B8'
    }
  })

  // Create test user with wallet
  const testUser = await prisma.user.upsert({
    where: { walletAddress: '0x1234567890123456789012345678901234567890' },
    update: {},
    create: {
      email: 'test-user@defi-wealth.com',
      name: 'Test User',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'user'
    }
  })

  // Create tokens
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin', decimals: 8, marketPrice: 45000, displayPrice: 45000 },
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, marketPrice: 3000, displayPrice: 3000 },
    { symbol: 'USDT', name: 'Tether', decimals: 6, marketPrice: 1, displayPrice: 1 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, marketPrice: 1, displayPrice: 1 },
    { symbol: 'BNB', name: 'Binance Coin', decimals: 18, marketPrice: 400, displayPrice: 400 },
    { symbol: 'SOL', name: 'Solana', decimals: 9, marketPrice: 100, displayPrice: 100 },
    { symbol: 'XRP', name: 'Ripple', decimals: 6, marketPrice: 0.6, displayPrice: 0.6 },
    { symbol: 'ADA', name: 'Cardano', decimals: 6, marketPrice: 0.5, displayPrice: 0.5 },
    { symbol: 'DOT', name: 'Polkadot', decimals: 10, marketPrice: 7, displayPrice: 7 },
    { symbol: 'DOGE', name: 'Dogecoin', decimals: 8, marketPrice: 0.08, displayPrice: 0.08 },
    { symbol: 'AVAX', name: 'Avalanche', decimals: 18, marketPrice: 35, displayPrice: 35 },
    { symbol: 'MATIC', name: 'Polygon', decimals: 18, marketPrice: 0.8, displayPrice: 0.8 }
  ]

  for (const token of tokens) {
    await prisma.token.upsert({
      where: { symbol: token.symbol },
      update: {},
      create: token
    })
  }

  // Give test user some initial balances
  await prisma.userTokenBalance.upsert({
    where: {
      userId_tokenSymbol: {
        userId: testUser.id,
        tokenSymbol: 'BTC'
      }
    },
    update: {
      actualBalance: 0.5,
      displayBalance: 0.5
    },
    create: {
      userId: testUser.id,
      tokenSymbol: 'BTC',
      actualBalance: 0.5,
      displayBalance: 0.5
    }
  })

  await prisma.userTokenBalance.upsert({
    where: {
      userId_tokenSymbol: {
        userId: testUser.id,
        tokenSymbol: 'ETH'
      }
    },
    update: {
      actualBalance: 5,
      displayBalance: 5
    },
    create: {
      userId: testUser.id,
      tokenSymbol: 'ETH',
      actualBalance: 5,
      displayBalance: 5
    }
  })

  await prisma.userTokenBalance.upsert({
    where: {
      userId_tokenSymbol: {
        userId: testUser.id,
        tokenSymbol: 'USDT'
      }
    },
    update: {
      actualBalance: 1000,
      displayBalance: 1000
    },
    create: {
      userId: testUser.id,
      tokenSymbol: 'USDT',
      actualBalance: 1000,
      displayBalance: 1000
    }
  })

  console.log('Database seeded successfully!')
  console.log('Admin user:', adminUser)
  console.log('Test user:', testUser)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })