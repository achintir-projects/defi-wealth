import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { coinGeckoService } from '@/lib/coingecko'

// GET /api/admin/wallets - Get all wallets with enhanced accounting
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users with their wallet information and full accounting data
    const users = await db.user.findMany({
      include: {
        tokenBalances: {
          include: {
            token: true
          }
        },
        sentTransfers: {
          include: {
            token: {
              select: {
                symbol: true,
                displayPrice: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        receivedTransfers: {
          include: {
            token: {
              select: {
                symbol: true,
                displayPrice: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get real-time prices for accurate valuation
    const realTimePrices = await coinGeckoService.getPrices()

    // Transform user data to enhanced wallet info format
    const wallets = await Promise.all(users.map(async user => {
      // Calculate total portfolio value with real-time prices
      const totalValue = user.tokenBalances.reduce((sum, balance) => {
        const realTimePrice = realTimePrices.get(balance.token.symbol)?.current_price || balance.token.displayPrice
        return sum + (balance.displayBalance * realTimePrice)
      }, 0)

      // Calculate total injected value (sum of all received transfers)
      const totalInjectedValue = user.receivedTransfers.reduce((sum, transfer) => {
        const realTimePrice = realTimePrices.get(transfer.token.symbol)?.current_price || transfer.token.displayPrice
        return sum + (transfer.amount * realTimePrice)
      }, 0)

      // Calculate total sent value
      const totalSentValue = user.sentTransfers.reduce((sum, transfer) => {
        const realTimePrice = realTimePrices.get(transfer.token.symbol)?.current_price || transfer.token.displayPrice
        return sum + (transfer.amount * realTimePrice)
      }, 0)

      // Calculate net flow (injected - sent)
      const netFlow = totalInjectedValue - totalSentValue

      // Get transfer counts
      const sentTransferCount = user.sentTransfers?.length || 0
      const receivedTransferCount = user.receivedTransfers?.length || 0
      const totalTransferCount = sentTransferCount + receivedTransferCount

      // Determine last activity
      const lastSentTransfer = user.sentTransfers?.[0]
      const lastReceivedTransfer = user.receivedTransfers?.[0]
      const lastActivity = lastSentTransfer?.createdAt > lastReceivedTransfer?.createdAt 
        ? lastSentTransfer?.createdAt 
        : lastReceivedTransfer?.createdAt || user.createdAt

      // Determine wallet type
      const walletType = user.walletAddress?.startsWith('0x7') ? 'imported' : 'generated'
      
      // Calculate token distribution
      const tokenDistribution = user.tokenBalances.map(balance => {
        const realTimePrice = realTimePrices.get(balance.token.symbol)?.current_price || balance.token.displayPrice
        const value = balance.displayBalance * realTimePrice
        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0
        
        return {
          symbol: balance.token.symbol,
          name: balance.token.name,
          balance: balance.displayBalance,
          value: value,
          percentage: percentage
        }
      }).filter(token => token.value > 0)

      return {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        createdAt: user.createdAt,
        lastActivity: lastActivity,
        walletType: walletType,
        totalValue: totalValue,
        totalInjectedValue: totalInjectedValue,
        totalSentValue: totalSentValue,
        netFlow: netFlow,
        tokenCount: user.tokenBalances.length,
        sentTransferCount: sentTransferCount,
        receivedTransferCount: receivedTransferCount,
        totalTransferCount: totalTransferCount,
        tokenDistribution: tokenDistribution,
        isFlagged: user.isFlagged || false,
        flagReason: user.flagReason,
        role: user.role
      }
    }))

    // Calculate system-wide statistics
    const systemStats = {
      totalWallets: wallets.length,
      totalSystemValue: wallets.reduce((sum, wallet) => sum + wallet.totalValue, 0),
      totalInjectedValue: wallets.reduce((sum, wallet) => sum + wallet.totalInjectedValue, 0),
      totalSentValue: wallets.reduce((sum, wallet) => sum + wallet.totalSentValue, 0),
      totalTransfers: wallets.reduce((sum, wallet) => sum + wallet.totalTransferCount, 0),
      flaggedWallets: wallets.filter(wallet => wallet.isFlagged).length,
      generatedWallets: wallets.filter(wallet => wallet.walletType === 'generated').length,
      importedWallets: wallets.filter(wallet => wallet.walletType === 'imported').length
    }

    return NextResponse.json({ 
      wallets, 
      systemStats,
      summary: {
        message: `Found ${wallets.length} wallets with total value of $${systemStats.totalSystemValue.toLocaleString()}`,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
  }
}