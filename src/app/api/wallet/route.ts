import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { coinGeckoService } from '@/lib/coingecko'

// Helper function to initialize portfolio with default tokens
async function initializePortfolio(userId: string, walletAddress: string) {
  // Get current market prices
  const realTimePrices = await coinGeckoService.getPrices()
  
  const defaultTokens = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
      decimals: 8,
      marketPrice: realTimePrices.get('BTC')?.current_price || 102000,
      displayPrice: realTimePrices.get('BTC')?.current_price || 102000,
      displayType: 'display'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
      decimals: 18,
      marketPrice: realTimePrices.get('ETH')?.current_price || 4200,
      displayPrice: realTimePrices.get('ETH')?.current_price || 4200,
      displayType: 'display'
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
      decimals: 6,
      marketPrice: realTimePrices.get('USDT')?.current_price || 1.00,
      displayPrice: realTimePrices.get('USDT')?.current_price || 1.00,
      displayType: 'display'
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
      decimals: 18,
      marketPrice: realTimePrices.get('BNB')?.current_price || 725,
      displayPrice: realTimePrices.get('BNB')?.current_price || 725,
      displayType: 'display'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
      decimals: 9,
      marketPrice: realTimePrices.get('SOL')?.current_price || 210,
      displayPrice: realTimePrices.get('SOL')?.current_price || 210,
      displayType: 'display'
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090',
      decimals: 6,
      marketPrice: realTimePrices.get('ADA')?.current_price || 0.68,
      displayPrice: realTimePrices.get('ADA')?.current_price || 0.68,
      displayType: 'display'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150',
      decimals: 10,
      marketPrice: realTimePrices.get('DOT')?.current_price || 10.85,
      displayPrice: realTimePrices.get('DOT')?.current_price || 10.85,
      displayType: 'display'
    },
    {
      symbol: 'XRP',
      name: 'Ripple',
      logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
      decimals: 6,
      marketPrice: realTimePrices.get('XRP')?.current_price || 0.72,
      displayPrice: realTimePrices.get('XRP')?.current_price || 0.72,
      displayType: 'display'
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449',
      decimals: 8,
      marketPrice: realTimePrices.get('DOGE')?.current_price || 0.195,
      displayPrice: realTimePrices.get('DOGE')?.current_price || 0.195,
      displayType: 'display'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360',
      decimals: 18,
      marketPrice: realTimePrices.get('AVAX')?.current_price || 48.5,
      displayPrice: realTimePrices.get('AVAX')?.current_price || 48.5,
      displayType: 'display'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png?1696502367',
      decimals: 18,
      marketPrice: realTimePrices.get('MATIC')?.current_price || 1.05,
      displayPrice: realTimePrices.get('MATIC')?.current_price || 1.05,
      displayType: 'display'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink_new_logo.png?1696502009',
      decimals: 18,
      marketPrice: realTimePrices.get('LINK')?.current_price || 19.2,
      displayPrice: realTimePrices.get('LINK')?.current_price || 19.2,
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

  // Create default tokens if they don't exist
  for (const tokenData of defaultTokens) {
    await db.token.upsert({
      where: { symbol: tokenData.symbol },
      update: tokenData,
      create: tokenData
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
}

// GET /api/wallet - Get portfolio for a specific wallet address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if database is available
    try {
      // Find user by wallet address
      let user = await db.user.findUnique({
        where: { walletAddress }
      })

      // If user doesn't exist, create them
      if (!user) {
        user = await db.user.create({
          data: {
            email: `user-${walletAddress.substring(0, 8)}@defi-wealth.com`,
            walletAddress,
            role: 'user'
          }
        })
        
        // Initialize portfolio with default tokens for new users
        await initializePortfolio(user.id, user.walletAddress || walletAddress)
      }

      // Get user's token balances
      const userBalances = await db.userTokenBalance.findMany({
        where: { userId: user.id },
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

      // If user has no balances (shouldn't happen after initialization, but just in case)
      if (userBalances.length === 0) {
        await initializePortfolio(user.id, user.walletAddress || walletAddress)
        // Try fetching balances again
        const updatedBalances = await db.userTokenBalance.findMany({
          where: { userId: user.id },
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
        
        if (updatedBalances.length === 0) {
          return NextResponse.json({
            totalValue: 0,
            totalChange24h: 0,
            tokens: [],
            user: {
              role: user.role,
              walletAddress: user.walletAddress
            }
          })
        }
        
        // Use the updated balances
        userBalances.splice(0, userBalances.length, ...updatedBalances)
      }

      const isAdmin = user.role === 'admin'
      
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

      const portfolio = {
        totalValue,
        totalChange24h: totalChange24h / tokens.length,
        tokens,
        user: {
          role: user.role,
          walletAddress: user.walletAddress
        }
      }

      return NextResponse.json(portfolio)
    } catch (dbError) {
      console.log('Database not available, using fallback data:', dbError)
      // Return empty portfolio for serverless environments
      return NextResponse.json({
        totalValue: 0,
        totalChange24h: 0,
        tokens: [],
        user: {
          role: 'user',
          walletAddress: walletAddress
        }
      })
    }
  } catch (error) {
    console.error('Error fetching wallet portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet portfolio' },
      { status: 500 }
    )
  }
}