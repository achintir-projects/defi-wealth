import { db } from '@/lib/db'
import { coinGeckoService } from '@/lib/coingecko'

/**
 * Initialize a user's portfolio with default tokens
 * This function can be imported and used across different API routes
 */
export async function initializePortfolio(userId: string, walletAddress: string) {
  try {
    console.log('Initializing portfolio for user:', userId, 'with wallet:', walletAddress)
    
    // Get current market prices
    const realTimePrices = await coinGeckoService.getPrices()
    
    const defaultTokens = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
        decimals: 8,
        marketPrice: realTimePrices.get('BTC')?.current_price || 109000,
        displayPrice: realTimePrices.get('BTC')?.current_price || 109000,
        displayType: 'display'
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
        decimals: 18,
        marketPrice: realTimePrices.get('ETH')?.current_price || 3400,
        displayPrice: realTimePrices.get('ETH')?.current_price || 3400,
        displayType: 'display'
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
        decimals: 6,
        marketPrice: 1,
        displayPrice: 1,
        displayType: 'display'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1696506694',
        decimals: 6,
        marketPrice: 1,
        displayPrice: 1,
        displayType: 'display'
      }
    ]

    // Create or update tokens in the database
    for (const tokenData of defaultTokens) {
      await db.token.upsert({
        where: { symbol: tokenData.symbol },
        update: {
          displayPrice: tokenData.displayPrice,
          marketPrice: tokenData.marketPrice,
          displayType: tokenData.displayType
        },
        create: {
          symbol: tokenData.symbol,
          name: tokenData.name,
          logo: tokenData.logo,
          decimals: tokenData.decimals,
          displayPrice: tokenData.displayPrice,
          marketPrice: tokenData.marketPrice,
          displayType: tokenData.displayType
        }
      })
    }

    // Initialize user token balances with small amounts for demonstration
    for (const tokenData of defaultTokens) {
      const initialBalance = tokenData.symbol === 'USDT' || tokenData.symbol === 'USDC' ? 1000 : 0.1
      
      await db.userTokenBalance.upsert({
        where: {
          userId_tokenSymbol: {
            userId: userId,
            tokenSymbol: tokenData.symbol
          }
        },
        update: {
          balance: initialBalance,
          displayBalance: initialBalance
        },
        create: {
          userId: userId,
          tokenSymbol: tokenData.symbol,
          balance: initialBalance,
          displayBalance: initialBalance
        }
      })
    }

    console.log('Portfolio initialized successfully for user:', userId)
    return true
  } catch (error) {
    console.error('Error initializing portfolio:', error)
    return false
  }
}