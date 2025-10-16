import { db } from '@/lib/db'

async function seedAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.user.findUnique({
      where: { id: 'admin-user-id' }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin)
      return
    }

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        id: 'admin-user-id',
        email: 'admin@defi-wealth.com',
        name: 'System Administrator',
        role: 'admin',
        walletAddress: '0x0000000000000000000000000000000000000000' // Admin wallet address
      }
    })

    console.log('Admin user created successfully:', adminUser)

    // Check if tokens exist, if not create them
    const tokens = [
      { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400', decimals: 8 },
      { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628', decimals: 18 },
      { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661', decimals: 6 },
      { symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970', decimals: 18 },
      { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756', decimals: 9 },
      { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090', decimals: 6 },
      { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150', decimals: 10 },
      { symbol: 'XRP', name: 'Ripple', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442', decimals: 6 },
      { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449', decimals: 8 },
      { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360', decimals: 18 },
    ]

    for (const token of tokens) {
      const existingToken = await db.token.findUnique({
        where: { symbol: token.symbol }
      })

      if (!existingToken) {
        await db.token.create({
          data: token
        })
        console.log(`Created token: ${token.symbol}`)
      }
    }

    console.log('Admin seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding admin:', error)
  }
}

// Run the seed function
seedAdmin()
  .then(() => {
    console.log('Seed script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Seed script failed:', error)
    process.exit(1)
  })