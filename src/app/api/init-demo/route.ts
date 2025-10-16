import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/init-demo - Initialize demo users and data
export async function POST() {
  try {
    // Create demo users
    const demoUsers = [
      {
        id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'user' as const
      },
      {
        id: 'demo-user-2',
        email: 'demo2@example.com',
        name: 'Demo User 2',
        role: 'user' as const
      },
      {
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin' as const
      }
    ]

    // Generate wallet addresses
    const usersWithAddresses = demoUsers.map(user => ({
      ...user,
      walletAddress: generateWalletAddress()
    }))

    // Create default tokens
    const defaultTokens = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
        decimals: 8,
        marketPrice: 65000,
        displayPrice: 85000,
        displayType: 'display'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
        decimals: 18,
        marketPrice: 3500,
        displayPrice: 4500,
        displayType: 'display'
      },
      {
        symbol: 'USDT',
        name: 'Tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
        decimals: 6,
        marketPrice: 1.00,
        displayPrice: 1.05,
        displayType: 'display'
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
        decimals: 18,
        marketPrice: 580,
        displayPrice: 720,
        displayType: 'display'
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
        decimals: 9,
        marketPrice: 150,
        displayPrice: 185,
        displayType: 'display'
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090',
        decimals: 6,
        marketPrice: 0.58,
        displayPrice: 0.72,
        displayType: 'display'
      }
    ]

    // Create demo balances
    const demoBalances = [
      // Demo User 1
      { userId: 'demo-user-id', symbol: 'BTC', displayBalance: 2.5, actualBalance: 0 },
      { userId: 'demo-user-id', symbol: 'ETH', displayBalance: 15.8, actualBalance: 0 },
      { userId: 'demo-user-id', symbol: 'USDT', displayBalance: 50000, actualBalance: 0 },
      { userId: 'demo-user-id', symbol: 'BNB', displayBalance: 125, actualBalance: 0 },
      { userId: 'demo-user-id', symbol: 'SOL', displayBalance: 450, actualBalance: 0 },
      { userId: 'demo-user-id', symbol: 'ADA', displayBalance: 25000, actualBalance: 0 },
      // Demo User 2
      { userId: 'demo-user-2', symbol: 'BTC', displayBalance: 1.0, actualBalance: 0 },
      { userId: 'demo-user-2', symbol: 'ETH', displayBalance: 8.5, actualBalance: 0 },
      { userId: 'demo-user-2', symbol: 'USDT', displayBalance: 25000, actualBalance: 0 },
      { userId: 'demo-user-2', symbol: 'BNB', displayBalance: 75, actualBalance: 0 },
      { userId: 'demo-user-2', symbol: 'SOL', displayBalance: 280, actualBalance: 0 },
      { userId: 'demo-user-2', symbol: 'ADA', displayBalance: 15000, actualBalance: 0 },
      // Admin User
      { userId: 'admin-user', symbol: 'BTC', displayBalance: 5.0, actualBalance: 0 },
      { userId: 'admin-user', symbol: 'ETH', displayBalance: 25.0, actualBalance: 0 },
      { userId: 'admin-user', symbol: 'USDT', displayBalance: 100000, actualBalance: 0 },
      { userId: 'admin-user', symbol: 'BNB', displayBalance: 200, actualBalance: 0 },
      { userId: 'admin-user', symbol: 'SOL', displayBalance: 650, actualBalance: 0 },
      { userId: 'admin-user', symbol: 'ADA', displayBalance: 40000, actualBalance: 0 }
    ]

    // Use transaction to ensure all data is created consistently
    await db.$transaction(async (tx) => {
      // Create users
      for (const userData of usersWithAddresses) {
        await tx.user.upsert({
          where: { id: userData.id },
          update: userData,
          create: userData
        })
      }

      // Create tokens
      for (const tokenData of defaultTokens) {
        await tx.token.upsert({
          where: { symbol: tokenData.symbol },
          update: tokenData,
          create: tokenData
        })
      }

      // Create user balances
      for (const balanceData of demoBalances) {
        await tx.userTokenBalance.upsert({
          where: {
            userId_tokenSymbol: {
              userId: balanceData.userId,
              tokenSymbol: balanceData.symbol
            }
          },
          update: {
            displayBalance: balanceData.displayBalance,
            actualBalance: balanceData.actualBalance,
            updatedAt: new Date()
          },
          create: {
            userId: balanceData.userId,
            tokenSymbol: balanceData.symbol,
            displayBalance: balanceData.displayBalance,
            actualBalance: balanceData.actualBalance
          }
        })
      }
    })

    return NextResponse.json({
      message: 'Demo data initialized successfully',
      users: usersWithAddresses.length,
      tokens: defaultTokens.length,
      balances: demoBalances.length,
      walletAddresses: usersWithAddresses.map(u => ({
        userId: u.id,
        name: u.name,
        walletAddress: u.walletAddress
      }))
    })

  } catch (error) {
    console.error('Error initializing demo data:', error)
    return NextResponse.json(
      { error: 'Failed to initialize demo data' },
      { status: 500 }
    )
  }
}

// Generate a realistic wallet address
function generateWalletAddress(): string {
  const chars = '0123456789abcdef'
  let address = '0x'
  for (let i = 0; i < 40; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return address
}