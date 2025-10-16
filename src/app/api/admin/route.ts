import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Admin update validation schema
const adminUpdateSchema = z.object({
  userId: z.string(),
  tokenUpdates: z.record(z.string(), z.object({
    price: z.number().nonnegative(),
    balance: z.number().nonnegative(),
  }))
})

// POST /api/admin/update-portfolio - Update user's portfolio (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = adminUpdateSchema.parse(body)
    
    const { userId, tokenUpdates } = validatedData
    
    // Update each token's display price and user's display balance
    for (const [tokenSymbol, update] of Object.entries(tokenUpdates)) {
      await db.$transaction(async (tx) => {
        // Update token display price
        await tx.token.update({
          where: { symbol: tokenSymbol },
          data: {
            displayPrice: update.price,
            updatedAt: new Date()
          }
        })
        
        // Update user's display balance
        await tx.userTokenBalance.upsert({
          where: {
            userId_tokenSymbol: {
              userId: userId,
              tokenSymbol: tokenSymbol
            }
          },
          update: {
            displayBalance: update.balance,
            updatedAt: new Date()
          },
          create: {
            userId: userId,
            tokenSymbol: tokenSymbol,
            displayBalance: update.balance,
            actualBalance: 0
          }
        })
      })
    }
    
    return NextResponse.json({
      message: 'Portfolio updated successfully',
      userId,
      updatedTokens: Object.keys(tokenUpdates)
    })
    
  } catch (error) {
    console.error('Error updating portfolio:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    )
  }
}

// GET /api/admin/users - Get all users (admin only)
export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        tokenBalances: {
          include: {
            token: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Format users for admin dashboard
    const formattedUsers = users.map(user => {
      let totalValue = 0
      
      const portfolio = user.tokenBalances.reduce((acc, balance) => {
        const token = balance.token
        const displayPrice = token.displayType === 'display' ? token.displayPrice : token.marketPrice
        const displayBalance = token.displayType === 'display' ? balance.displayBalance : balance.actualBalance
        const value = displayBalance * displayPrice
        
        totalValue += value
        
        acc[token.symbol] = {
          name: token.name,
          symbol: token.symbol,
          balance: displayBalance,
          price: displayPrice,
          value: value,
          actualBalance: balance.actualBalance,
          marketPrice: token.marketPrice,
          displayBalance: balance.displayBalance,
          displayPrice: token.displayPrice,
          displayType: token.displayType
        }
        
        return acc
      }, {} as Record<string, any>)
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        totalValue,
        portfolio
      }
    })
    
    return NextResponse.json(formattedUsers)
    
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}