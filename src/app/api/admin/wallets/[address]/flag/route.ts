import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ address: string }>
}

// POST /api/admin/wallets/[address]/flag - Flag wallet
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { address } = await context.params
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }
    
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update user to flag the wallet
    const updatedUser = await db.user.update({
      where: { walletAddress: address },
      data: {
        isFlagged: true,
        flagReason: reason
      }
    })

    return NextResponse.json({ 
      message: 'Wallet flagged successfully',
      walletAddress: updatedUser.walletAddress,
      isFlagged: updatedUser.isFlagged,
      flagReason: updatedUser.flagReason
    })
  } catch (error) {
    console.error('Error flagging wallet:', error)
    return NextResponse.json({ error: 'Failed to flag wallet' }, { status: 500 })
  }
}