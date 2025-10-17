import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { coinGeckoService } from '@/lib/coingecko'
import { initializePortfolio } from '@/lib/portfolioUtils'

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

    // Validate the wallet address format
    const { isValidEthereumAddress } = await import('@/lib/walletUtils')
    if (!isValidEthereumAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    console.log('Processing wallet request for address:', walletAddress)
    
    // Check if database is available
    try {
      // Find user by wallet address
      let user = await db.user.findUnique({
        where: { walletAddress }
      })

      // If user doesn't exist, create them automatically for any valid Ethereum address
      if (!user) {
        console.log('Creating new user for wallet address:', walletAddress)
        user = await db.user.create({
          data: {
            email: `user-${walletAddress.substring(0, 8)}@defi-wealth.com`,
            walletAddress,
            role: 'user'
          }
        })
        
        console.log('Created new user:', user.id, 'for wallet:', walletAddress)
        
        // Initialize portfolio with default tokens for new users
        await initializePortfolio(user.id, user.walletAddress || walletAddress)
        
        console.log('Portfolio initialized for new user:', user.id)
      } else {
        console.log('Found existing user:', user.id, 'for wallet:', walletAddress)
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

      // Debug log to check balances
      console.log('User balances found:', userBalances.length, 'for user:', user.id)

      // If user has no balances (shouldn't happen after initialization, but just in case)
      if (userBalances.length === 0) {
        console.log('No balances found, initializing portfolio...')
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
        
        console.log('Updated balances after initialization:', updatedBalances.length)
        
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
        },
        // Include metadata about the wallet
        walletInfo: {
          isNew: userBalances.length === 0,
          createdAt: user.createdAt,
          walletType: walletAddress.startsWith('0x7') ? 'imported' : 'generated'
        }
      }

      console.log('Returning portfolio for wallet:', walletAddress, 'with', tokens.length, 'tokens')
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
        },
        walletInfo: {
          isNew: true,
          createdAt: new Date().toISOString(),
          walletType: walletAddress.startsWith('0x7') ? 'imported' : 'generated'
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