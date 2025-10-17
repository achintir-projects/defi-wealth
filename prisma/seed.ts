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

  // Create tokens with current market prices (October 2025)
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin', decimals: 8, marketPrice: 109000, displayPrice: 109000 },
    { symbol: 'ETH', name: 'Ethereum', decimals: 18, marketPrice: 3900, displayPrice: 3900 },
    { symbol: 'USDT', name: 'Tether', decimals: 6, marketPrice: 1.00, displayPrice: 1.00 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, marketPrice: 1.00, displayPrice: 1.00 },
    { symbol: 'BNB', name: 'BNB', decimals: 18, marketPrice: 1148, displayPrice: 1148 },
    { symbol: 'SOL', name: 'Solana', decimals: 9, marketPrice: 187, displayPrice: 187 },
    { symbol: 'XRP', name: 'Ripple', decimals: 6, marketPrice: 2.36, displayPrice: 2.36 },
    { symbol: 'ADA', name: 'Cardano', decimals: 6, marketPrice: 0.65, displayPrice: 0.65 },
    { symbol: 'DOT', name: 'Polkadot', decimals: 10, marketPrice: 3.04, displayPrice: 3.04 },
    { symbol: 'DOGE', name: 'Dogecoin', decimals: 8, marketPrice: 0.19, displayPrice: 0.19 },
    { symbol: 'AVAX', name: 'Avalanche', decimals: 18, marketPrice: 20.92, displayPrice: 20.92 },
    { symbol: 'MATIC', name: 'Polygon', decimals: 18, marketPrice: 0.19, displayPrice: 0.19 }
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