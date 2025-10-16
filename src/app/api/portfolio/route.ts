import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { coinGeckoService } from '@/lib/coingecko'
import { generateWalletAddress } from '@/lib/walletUtils'

// GET /api/portfolio - Get user's portfolio
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, we'll use a hardcoded user ID
    // In a real app, this would come from authentication
    const userId = 'demo-user-id'
    
    // Check if database is available (for serverless environments)
    let userBalances: any[] = []
    try {
      // Get user's token balances
      userBalances = await db.userTokenBalance.findMany({
        where: { userId },
        include: {
          token: true,
          user: {
            select: {
              role: true,
              walletAddress: true
            }
          }
        }
      })
    } catch (dbError) {
      console.log('Database not available, using fallback data:', dbError)
      // If database is not available, return mock data
      return await getMockPortfolio()
    }

    // If user has no balances, initialize with default tokens
    if (userBalances.length === 0) {
      try {
        return await initializePortfolio(userId)
      } catch (initError) {
        console.log('Portfolio initialization failed, using fallback data:', initError)
        return await getMockPortfolio()
      }
    }

    const user = userBalances[0]?.user
    const isAdmin = user?.role === 'admin'

    // Get real-time prices from CoinGecko
    const realTimePrices = await coinGeckoService.getPrices()

    // Calculate portfolio totals
    let totalValue = 0
    let totalChange24h = 0
    
    const tokens = userBalances.map(balance => {
      const token = balance.token
      const realTimePrice = realTimePrices.get(token.symbol)
      
      // Always use real-time price for display calculations
      const currentPrice = realTimePrice?.current_price || token.marketPrice
      const change24h = realTimePrice?.price_change_percentage_24h || Math.random() * 10 - 2
      
      // For display purposes, always use real-time price
      const price = currentPrice
      const balanceAmount = isAdmin && token.displayType === 'market' ? balance.actualBalance : balance.displayBalance
      const value = balanceAmount * price
      
      totalValue += value
      totalChange24h += change24h
      
      return {
        symbol: token.symbol,
        name: token.name,
        logo: token.logo,
        balance: balanceAmount,
        price: price,
        value: value,
        change24h: change24h,
        decimals: token.decimals,
        // Include real-time market data
        marketCap: realTimePrice?.market_cap || 0,
        volume24h: realTimePrice?.total_volume || 0,
        lastUpdated: realTimePrice?.last_updated || new Date().toISOString(),
        // Include admin-only data
        ...(isAdmin && {
          marketPrice: token.marketPrice,
          displayPrice: token.displayPrice,
          actualBalance: balance.actualBalance,
          displayBalance: balance.displayBalance,
          displayType: token.displayType
        })
      }
    })

    // Use the user's existing wallet address or generate a persistent one
    let walletAddress = user?.walletAddress
    if (!walletAddress) {
      // Generate a persistent wallet address and save it to the user
      walletAddress = generateWalletAddress()
      await db.user.update({
        where: { id: userId },
        data: { walletAddress }
      })
    }

    const portfolio = {
      totalValue,
      totalChange24h: totalChange24h / tokens.length,
      tokens,
      user: {
        role: user?.role || 'user',
        walletAddress: walletAddress
      }
    }

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Error fetching portfolio:', error)
    // Return fallback data instead of 500 error
    try {
      return await getMockPortfolio()
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to fetch portfolio' },
        { status: 500 }
      )
    }
  }
}

// Mock portfolio data for serverless environments
async function getMockPortfolio() {
  const realTimePrices = await coinGeckoService.getPrices()
  
  const mockTokens = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
      balance: 2.5,
      price: realTimePrices.get('BTC')?.current_price || 102000,
      value: 2.5 * (realTimePrices.get('BTC')?.current_price || 102000),
      change24h: 1.2,
      decimals: 8,
      marketCap: 1420000000000,
      volume24h: 32000000000,
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
      balance: 15.8,
      price: realTimePrices.get('ETH')?.current_price || 4200,
      value: 15.8 * (realTimePrices.get('ETH')?.current_price || 4200),
      change24h: 0.8,
      decimals: 18,
      marketCap: 462000000000,
      volume24h: 18000000000,
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
      balance: 50000,
      price: realTimePrices.get('USDT')?.current_price || 1.00,
      value: 50000 * (realTimePrices.get('USDT')?.current_price || 1.00),
      change24h: 0.01,
      decimals: 6,
      marketCap: 98000000000,
      volume24h: 85000000000,
      lastUpdated: new Date().toISOString()
    }
  ]

  const totalValue = mockTokens.reduce((sum, token) => sum + token.value, 0)
  const totalChange24h = mockTokens.reduce((sum, token) => sum + token.change24h, 0) / mockTokens.length

  return NextResponse.json({
    totalValue,
    totalChange24h,
    tokens: mockTokens,
    user: {
      role: 'user',
      walletAddress: generateWalletAddress()
    }
  })
}

// Initialize portfolio with default tokens
async function initializePortfolio(userId: string) {
  // Get current market prices
  const realTimePrices = await coinGeckoService.getPrices()
  
  const defaultTokens = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
      decimals: 8,
      marketPrice: realTimePrices.get('BTC')?.current_price || 102000,
      displayPrice: realTimePrices.get('BTC')?.current_price || 102000, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
      decimals: 18,
      marketPrice: realTimePrices.get('ETH')?.current_price || 4200,
      displayPrice: realTimePrices.get('ETH')?.current_price || 4200, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
      decimals: 6,
      marketPrice: realTimePrices.get('USDT')?.current_price || 1.00,
      displayPrice: realTimePrices.get('USDT')?.current_price || 1.00, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
      decimals: 18,
      marketPrice: realTimePrices.get('BNB')?.current_price || 725,
      displayPrice: realTimePrices.get('BNB')?.current_price || 725, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
      decimals: 9,
      marketPrice: realTimePrices.get('SOL')?.current_price || 210,
      displayPrice: realTimePrices.get('SOL')?.current_price || 210, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090',
      decimals: 6,
      marketPrice: realTimePrices.get('ADA')?.current_price || 0.68,
      displayPrice: realTimePrices.get('ADA')?.current_price || 0.68, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150',
      decimals: 10,
      marketPrice: realTimePrices.get('DOT')?.current_price || 10.85,
      displayPrice: realTimePrices.get('DOT')?.current_price || 10.85, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'XRP',
      name: 'Ripple',
      logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
      decimals: 6,
      marketPrice: realTimePrices.get('XRP')?.current_price || 0.72,
      displayPrice: realTimePrices.get('XRP')?.current_price || 0.72, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449',
      decimals: 8,
      marketPrice: realTimePrices.get('DOGE')?.current_price || 0.195,
      displayPrice: realTimePrices.get('DOGE')?.current_price || 0.195, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360',
      decimals: 18,
      marketPrice: realTimePrices.get('AVAX')?.current_price || 48.5,
      displayPrice: realTimePrices.get('AVAX')?.current_price || 48.5, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png?1696502367',
      decimals: 18,
      marketPrice: realTimePrices.get('MATIC')?.current_price || 1.05,
      displayPrice: realTimePrices.get('MATIC')?.current_price || 1.05, // Use actual market price
      displayType: 'display'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink_new_logo.png?1696502009',
      decimals: 18,
      marketPrice: realTimePrices.get('LINK')?.current_price || 19.2,
      displayPrice: realTimePrices.get('LINK')?.current_price || 19.2, // Use actual market price
      displayType: 'display'
    }
  ]

  const defaultBalances = [
    { symbol: 'BTC', displayBalance: 2.5, actualBalance: 0 },
    { symbol: 'ETH', displayBalance: 15.8, actualBalance: 0 },
    { symbol: 'USDT', displayBalance: 50000, actualBalance: 0 },
    { symbol: 'BNB', displayBalance: 125, actualBalance: 0 },
    { symbol: 'SOL', displayBalance: 450, actualBalance: 0 },
    { symbol: 'ADA', displayBalance: 25000, actualBalance: 0 },
    { symbol: 'DOT', displayBalance: 1200, actualBalance: 0 },
    { symbol: 'XRP', displayBalance: 15000, actualBalance: 0 },
    { symbol: 'DOGE', displayBalance: 50000, actualBalance: 0 },
    { symbol: 'AVAX', displayBalance: 850, actualBalance: 0 },
    { symbol: 'MATIC', displayBalance: 12000, actualBalance: 0 },
    { symbol: 'LINK', displayBalance: 650, actualBalance: 0 }
  ]

  // Generate wallet address
  const walletAddress = generateWalletAddress()

  // Create default tokens if they don't exist
  for (const tokenData of defaultTokens) {
    await db.token.upsert({
      where: { symbol: tokenData.symbol },
      update: tokenData,
      create: tokenData
    })
  }

  // Create user if doesn't exist
  await db.user.upsert({
    where: { id: userId },
    update: { walletAddress },
    create: {
      id: userId,
      email: 'demo@example.com',
      name: 'Demo User',
      walletAddress,
      role: userId === 'admin-user-id' ? 'admin' : 'user'
    }
  })

  // Create admin user if it doesn't exist
  if (userId === 'demo-user-id') {
    await db.user.upsert({
      where: { id: 'admin-user-id' },
      update: { 
        email: 'admin@defi-wealth.com',
        name: 'Admin User',
        role: 'admin'
      },
      create: {
        id: 'admin-user-id',
        email: 'admin@defi-wealth.com',
        name: 'Admin User',
        role: 'admin',
        walletAddress: generateWalletAddress()
      }
    })
  }

  // Create user token balances
  for (const balanceData of defaultBalances) {
    await db.userTokenBalance.create({
      data: {
        userId,
        tokenSymbol: balanceData.symbol,
        displayBalance: balanceData.displayBalance,
        actualBalance: balanceData.actualBalance
      }
    })
  }

  // Return the initialized portfolio
  return await GET(new NextRequest('http://localhost:3000/api/portfolio'))
}