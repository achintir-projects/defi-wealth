import { NextRequest, NextResponse } from 'next/server'
import { coinGeckoService } from '@/lib/coingecko'

// POST /api/admin/refresh-prices - Force refresh crypto prices
export async function POST(request: NextRequest) {
  try {
    // Force refresh prices
    await coinGeckoService.forceRefreshPrices()
    
    return NextResponse.json({
      message: 'Prices refreshed successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error refreshing prices:', error)
    return NextResponse.json(
      { error: 'Failed to refresh prices' },
      { status: 500 }
    )
  }
}