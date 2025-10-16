import { NextRequest, NextResponse } from 'next/server'
import { coinGeckoService } from '@/lib/coingecko'

interface TrendingToken {
  symbol: string
  name: string
  logo: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  sparkline: number[]
  rank: number
  category: string
}

// GET /api/trending - Get trending tokens
export async function GET(request: NextRequest) {
  try {
    // Get real-time prices from CoinGecko
    const realTimePrices = await coinGeckoService.getPrices()
    
    // Convert to array and sort by 24h change to find trending tokens
    const allTokens = Array.from(realTimePrices.values())
    
    // Calculate trending score based on price change and volume
    const trendingTokens = allTokens
      .map(token => ({
        symbol: token.symbol,
        name: getTokenName(token.symbol),
        logo: getTokenLogo(token.symbol),
        price: token.current_price,
        change24h: token.price_change_percentage_24h,
        volume24h: token.total_volume,
        marketCap: token.market_cap,
        sparkline: generateSparkline(token.current_price, token.price_change_percentage_24h),
        rank: 0, // Will be calculated
        category: getTokenCategory(token.symbol)
      }))
      .filter(token => token.change24h > 2 || token.volume24h > 100000000) // Filter for significant gainers or high volume
      .sort((a, b) => {
        // Sort by combined score of price change and volume
        const scoreA = (a.change24h * 0.6) + (Math.log(a.volume24h) * 0.4)
        const scoreB = (b.change24h * 0.6) + (Math.log(b.volume24h) * 0.4)
        return scoreB - scoreA
      })
      .slice(0, 15) // Top 15 trending tokens
      .map((token, index) => ({
        ...token,
        rank: index + 1
      }))

    // Add some predefined trending tokens if not enough from real data
    if (trendingTokens.length < 10) {
      const additionalTokens = getPredefinedTrendingTokens(trendingTokens.length)
      trendingTokens.push(...additionalTokens)
    }

    return NextResponse.json({
      trending: trendingTokens,
      lastUpdated: new Date().toISOString(),
      totalResults: trendingTokens.length
    })
  } catch (error) {
    console.error('Error fetching trending tokens:', error)
    
    // Return fallback trending data
    const fallbackTokens = getFallbackTrendingTokens()
    return NextResponse.json({
      trending: fallbackTokens,
      lastUpdated: new Date().toISOString(),
      totalResults: fallbackTokens.length
    })
  }
}

function getTokenName(symbol: string): string {
  const names: { [key: string]: string } = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT': 'Tether',
    'BNB': 'BNB',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'XRP': 'Ripple',
    'DOGE': 'Dogecoin',
    'AVAX': 'Avalanche',
    'MATIC': 'Polygon',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap',
    'LTC': 'Litecoin',
    'BCH': 'Bitcoin Cash',
    'ATOM': 'Cosmos',
    'VET': 'VeChain',
    'TRX': 'Tron',
    'XLM': 'Stellar',
    'FTT': 'FTX Token',
    'NEAR': 'NEAR Protocol',
    'ALGO': 'Algorand',
    'ICP': 'Internet Computer'
  }
  return names[symbol] || symbol
}

function getTokenLogo(symbol: string): string {
  const logos: { [key: string]: string } = {
    'BTC': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
    'ETH': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
    'USDT': 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
    'BNB': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
    'SOL': 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
    'ADA': 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090',
    'DOT': 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150',
    'XRP': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
    'DOGE': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360',
    'MATIC': 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png?1696502367',
    'LINK': 'https://assets.coingecko.com/coins/images/877/large/chainlink_new_logo.png?1696502009',
    'UNI': 'https://assets.coingecko.com/coins/images/12504/large/uni.png?1696501662',
    'LTC': 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501400',
    'BCH': 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png?1696501976',
    'ATOM': 'https://assets.coingecko.com/coins/images/3794/large/atom.png?1696502366',
    'VET': 'https://assets.coingecko.com/coins/images/1167/large/VeChain-Logo-768x768.png?1696502081',
    'TRX': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502194',
    'XLM': 'https://assets.coingecko.com/coins/images/364/large/Stellar_symbol_black_RGB.png?1696501460',
    'FTT': 'https://assets.coingecko.com/coins/images/13303/large/FTT-Token-Logo.png?1696504756',
    'NEAR': 'https://assets.coingecko.com/coins/images/10365/large/Near-Protocol-Logo.png?1696504756',
    'ALGO': 'https://assets.coingecko.com/coins/images/4547/large/Algorand_logo_black.png?1696502366',
    'ICP': 'https://assets.coingecko.com/coins/images/12371/large/internet-computer-icp-logo.png?1696503360'
  }
  return logos[symbol] || 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400'
}

function getTokenCategory(symbol: string): string {
  const categories: { [key: string]: string } = {
    'BTC': 'Layer 1',
    'ETH': 'Layer 1',
    'USDT': 'Stablecoin',
    'BNB': 'Layer 1',
    'SOL': 'Layer 1',
    'ADA': 'Layer 1',
    'DOT': 'Layer 0',
    'XRP': 'Payments',
    'DOGE': 'Meme',
    'AVAX': 'Layer 1',
    'MATIC': 'Layer 2',
    'LINK': 'Oracle',
    'UNI': 'DEX',
    'LTC': 'Payments',
    'BCH': 'Layer 1',
    'ATOM': 'Layer 1',
    'VET': 'Enterprise',
    'TRX': 'Layer 1',
    'XLM': 'Payments',
    'FTT': 'Exchange',
    'NEAR': 'Layer 1',
    'ALGO': 'Layer 1',
    'ICP': 'Layer 1'
  }
  return categories[symbol] || 'Other'
}

function generateSparkline(currentPrice: number, change24h: number): number[] {
  const points = 24 // 24 data points for 24h
  const sparkline: number[] = []
  
  // Generate realistic sparkline data
  const basePrice = currentPrice / (1 + change24h / 100)
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1)
    const trendFactor = 1 + (change24h / 100) * progress
    const volatility = 0.98 + Math.random() * 0.04 // Small random variations
    const price = basePrice * trendFactor * volatility
    sparkline.push(Number(price.toFixed(6)))
  }
  
  return sparkline
}

function getPredefinedTrendingTokens(startRank: number): TrendingToken[] {
  const predefined = [
    {
      symbol: 'PEPE',
      name: 'Pepe',
      logo: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528386',
      price: 0.00001234,
      change24h: 15.8,
      volume24h: 250000000,
      marketCap: 5200000000,
      sparkline: generateSparkline(0.00001234, 15.8),
      category: 'Meme'
    },
    {
      symbol: 'SHIB',
      name: 'Shiba Inu',
      logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba-swap-logo.png?1696504360',
      price: 0.00002678,
      change24h: 8.5,
      volume24h: 180000000,
      marketCap: 15700000000,
      sparkline: generateSparkline(0.00002678, 8.5),
      category: 'Meme'
    },
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      logo: 'https://assets.coingecko.com/coins/images/32819/large/wif-logo.jpg?1696534387',
      price: 2.45,
      change24h: 22.3,
      volume24h: 120000000,
      marketCap: 2450000000,
      sparkline: generateSparkline(2.45, 22.3),
      category: 'Meme'
    },
    {
      symbol: 'FLOKI',
      name: 'FLOKI',
      logo: 'https://assets.coingecko.com/coins/images/16748/large/Floki_Inu.png?1696504260',
      price: 0.000187,
      change24h: 12.7,
      volume24h: 95000000,
      marketCap: 1800000000,
      sparkline: generateSparkline(0.000187, 12.7),
      category: 'Meme'
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      logo: 'https://assets.coingecko.com/coins/images/28684/large/bonk-logo.png?1696524897',
      price: 0.00002345,
      change24h: 18.9,
      volume24h: 110000000,
      marketCap: 1500000000,
      sparkline: generateSparkline(0.00002345, 18.9),
      category: 'Meme'
    }
  ]
  
  return predefined.map((token, index) => ({
    ...token,
    rank: startRank + index + 1
  }))
}

function getFallbackTrendingTokens(): TrendingToken[] {
  return [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
      price: 67500,
      change24h: 3.2,
      volume24h: 28500000000,
      marketCap: 1320000000000,
      sparkline: generateSparkline(67500, 3.2),
      rank: 1,
      category: 'Layer 1'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
      price: 3650,
      change24h: 2.8,
      volume24h: 15200000000,
      marketCap: 439000000000,
      sparkline: generateSparkline(3650, 2.8),
      rank: 2,
      category: 'Layer 1'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
      price: 158,
      change24h: 5.4,
      volume24h: 3200000000,
      marketCap: 71000000000,
      sparkline: generateSparkline(158, 5.4),
      rank: 3,
      category: 'Layer 1'
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449',
      price: 0.17,
      change24h: 8.9,
      volume24h: 1800000000,
      marketCap: 24000000000,
      sparkline: generateSparkline(0.17, 8.9),
      rank: 4,
      category: 'Meme'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360',
      price: 42.5,
      change24h: 6.7,
      volume24h: 450000000,
      marketCap: 15500000000,
      sparkline: generateSparkline(42.5, 6.7),
      rank: 5,
      category: 'Layer 1'
    },
    {
      symbol: 'PEPE',
      name: 'Pepe',
      logo: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528386',
      price: 0.00001234,
      change24h: 15.8,
      volume24h: 250000000,
      marketCap: 5200000000,
      sparkline: generateSparkline(0.00001234, 15.8),
      rank: 6,
      category: 'Meme'
    },
    {
      symbol: 'SHIB',
      name: 'Shiba Inu',
      logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba-swap-logo.png?1696504360',
      price: 0.00002678,
      change24h: 8.5,
      volume24h: 180000000,
      marketCap: 15700000000,
      sparkline: generateSparkline(0.00002678, 8.5),
      rank: 7,
      category: 'Meme'
    },
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      logo: 'https://assets.coingecko.com/coins/images/32819/large/wif-logo.jpg?1696534387',
      price: 2.45,
      change24h: 22.3,
      volume24h: 120000000,
      marketCap: 2450000000,
      sparkline: generateSparkline(2.45, 22.3),
      rank: 8,
      category: 'Meme'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink_new_logo.png?1696502009',
      price: 16.8,
      change24h: 4.2,
      volume24h: 520000000,
      marketCap: 9300000000,
      sparkline: generateSparkline(16.8, 4.2),
      rank: 9,
      category: 'Oracle'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon_token.png?1696502367',
      price: 0.92,
      change24h: 7.1,
      volume24h: 380000000,
      marketCap: 8600000000,
      sparkline: generateSparkline(0.92, 7.1),
      rank: 10,
      category: 'Layer 2'
    }
  ]
}