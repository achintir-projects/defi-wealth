import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ address: string }>
}

// GET /api/admin/wallets/[address] - Get wallet details
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { address } = await context.params
    
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with wallet details
    const user = await db.user.findUnique({
      where: { walletAddress: address },
      include: {
        tokenBalances: {
          include: {
            token: true
          }
        },
        sentTransfers: {
          include: {
            token: true,
            toUser: {
              select: {
                id: true,
                email: true,
                walletAddress: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        receivedTransfers: {
          include: {
            token: true,
            fromUser: {
              select: {
                id: true,
                email: true,
                walletAddress: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Calculate total value
    const totalValue = user.tokenBalances.reduce((sum, balance) => {
      return sum + (balance.displayBalance * balance.token.displayPrice)
    }, 0)

    // Format balances
    const balances = user.tokenBalances.map(balance => ({
      tokenSymbol: balance.token.symbol,
      tokenName: balance.token.name,
      tokenLogo: balance.token.logo,
      balance: balance.displayBalance,
      decimals: balance.token.decimals,
      price: balance.token.displayPrice
    }))

    // Format transfers
    const transfers = [
      ...user.sentTransfers.map(transfer => ({
        id: transfer.id,
        type: 'sent' as const,
        tokenSymbol: transfer.token.symbol,
        tokenName: transfer.token.name,
        tokenLogo: transfer.token.logo,
        amount: transfer.amount,
        tokenDecimals: transfer.token.decimals,
        counterparty: transfer.toUser?.email || transfer.toAddress,
        counterpartyAddress: transfer.toAddress,
        createdAt: transfer.createdAt,
        value: transfer.amount * transfer.token.displayPrice
      })),
      ...user.receivedTransfers.map(transfer => ({
        id: transfer.id,
        type: 'received' as const,
        tokenSymbol: transfer.token.symbol,
        tokenName: transfer.token.name,
        tokenLogo: transfer.token.logo,
        amount: transfer.amount,
        tokenDecimals: transfer.token.decimals,
        counterparty: transfer.fromUser?.email || transfer.fromAddress,
        counterpartyAddress: transfer.fromAddress,
        createdAt: transfer.createdAt,
        value: transfer.amount * transfer.token.displayPrice
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      walletAddress: user.walletAddress,
      email: user.email,
      totalValue,
      isFlagged: user.isFlagged || false,
      flagReason: user.flagReason,
      balances,
      transfers
    })
  } catch (error) {
    console.error('Error fetching wallet details:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet details' }, { status: 500 })
  }
}

// DELETE /api/admin/wallets/[address] - Delete wallet
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { address } = await context.params
    
    // Verify admin access
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user and all related data
    await db.$transaction(async (tx) => {
      // First get the user ID
      const userToDelete = await tx.user.findUnique({
        where: { walletAddress: address },
        select: { id: true }
      })

      if (!userToDelete) {
        throw new Error('User not found')
      }

      // Delete balances
      await tx.userTokenBalance.deleteMany({
        where: {
          userId: userToDelete.id
        }
      })

      // Delete transfers
      await tx.transfer.deleteMany({
        where: {
          OR: [
            { fromAddress: address },
            { toAddress: address }
          ]
        }
      })

      // Delete user
      await tx.user.delete({
        where: { walletAddress: address }
      })
    })

    return NextResponse.json({ message: 'Wallet deleted successfully' })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json({ error: 'Failed to delete wallet' }, { status: 500 })
  }
}