import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/wallets - Get all wallets
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users with their wallet information
    const users = await db.user.findMany({
      include: {
        tokenBalances: {
          include: {
            token: true
          }
        },
        sentTransfers: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        },
        receivedTransfers: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform user data to wallet info format
    const wallets = users.map(user => {
      const totalValue = user.tokenBalances.reduce((sum, balance) => {
        return sum + (balance.displayBalance * balance.token.displayPrice)
      }, 0)

      const transferCount = (user.sentTransfers?.length || 0) + (user.receivedTransfers?.length || 0)
      const lastActivity = user.sentTransfers?.[0]?.createdAt || 
                          user.receivedTransfers?.[0]?.createdAt || 
                          user.createdAt

      return {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        createdAt: user.createdAt,
        lastActivity: lastActivity,
        totalValue: totalValue,
        tokenCount: user.tokenBalances.length,
        transferCount: transferCount,
        isFlagged: user.isFlagged || false,
        flagReason: user.flagReason
      }
    })

    return NextResponse.json({ wallets })
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
  }
}