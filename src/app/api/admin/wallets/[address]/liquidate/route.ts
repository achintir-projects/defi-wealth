import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ address: string }>
}

// POST /api/admin/wallets/[address]/liquidate - Liquidate wallet tokens
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { address } = await context.params
    
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with balances
    const user = await db.user.findUnique({
      where: { walletAddress: address },
      include: {
        tokenBalances: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Liquidate all token balances (set to zero)
    const liquidatedBalances = await db.userTokenBalance.updateMany({
      where: {
        userId: user.id
      },
      data: {
        displayBalance: 0,
        actualBalance: 0,
        updatedAt: new Date()
      }
    })

    // Record liquidation action (you might want to create a separate table for audit logs)
    console.log(`Admin liquidated wallet ${address}. Affected balances: ${liquidatedBalances.count}`)

    return NextResponse.json({ 
      message: 'Wallet liquidated successfully',
      walletAddress: address,
      liquidatedBalances: liquidatedBalances.count
    })
  } catch (error) {
    console.error('Error liquidating wallet:', error)
    return NextResponse.json({ error: 'Failed to liquidate wallet' }, { status: 500 })
  }
}