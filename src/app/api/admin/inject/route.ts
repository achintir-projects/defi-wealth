import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Admin token injection validation schema
const injectionSchema = z.object({
  walletAddress: z.string(),
  tokenSymbol: z.string(),
  amount: z.number().positive(),
  message: z.string().optional()
})

// POST /api/admin/inject - Inject tokens to a wallet (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = injectionSchema.parse(body)
    
    const { walletAddress, tokenSymbol, amount, message } = validatedData
    
    console.log('Processing token injection for:', { walletAddress, tokenSymbol, amount })
    
    // Verify admin authentication (in a real app, this would use proper auth)
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      console.log('Unauthorized access attempt:', adminId)
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }
    
    // Get admin user to verify role
    let adminUser = await db.user.findUnique({
      where: { id: adminId }
    })
    
    // Create admin user if it doesn't exist
    if (!adminUser) {
      console.log('Creating admin user:', adminId)
      adminUser = await db.user.create({
        data: {
          id: adminId,
          email: 'admin@defi-wealth.com',
          walletAddress: '0x0000000000000000000000000000000000000000',
          role: 'admin'
        }
      })
    }
    
    if (!adminUser || adminUser.role !== 'admin') {
      console.log('Admin verification failed for user:', adminId)
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      )
    }
    
    // Find or create the target user by wallet address
    let targetUser = await db.user.findUnique({
      where: { walletAddress }
    })
    
    if (!targetUser) {
      console.log('Creating new user for wallet:', walletAddress)
      targetUser = await db.user.create({
        data: {
          email: `user-${walletAddress.substring(0, 8)}@defi-wealth.com`,
          walletAddress,
          role: 'user'
        }
      })
    }
    
    // Verify the token exists, create if it doesn't
    let token = await db.token.findUnique({
      where: { symbol: tokenSymbol }
    })
    
    if (!token) {
      console.log('Token not found, creating token:', tokenSymbol)
      // Create the token with default values
      token = await db.token.create({
        data: {
          symbol: tokenSymbol,
          name: tokenSymbol, // Use symbol as name by default
          logo: `https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400`, // Default logo
          decimals: 18, // Default decimals
          marketPrice: 1.0, // Default price
          displayPrice: 1.0,
          displayType: 'display'
        }
      })
    }
    
    console.log('Token found/created:', token.symbol, token.id)
    
    // Generate transaction hash for the injection
    const txHash = generateTxHash()
    
    console.log('Performing token injection...')
    
    // Perform the token injection
    await db.$transaction(async (tx) => {
      // Update or create user token balance
      const balanceResult = await tx.userTokenBalance.upsert({
        where: {
          userId_tokenSymbol: {
            userId: targetUser.id,
            tokenSymbol: tokenSymbol
          }
        },
        update: {
          displayBalance: {
            increment: amount
          },
          actualBalance: {
            increment: amount
          },
          updatedAt: new Date()
        },
        create: {
          userId: targetUser.id,
          tokenSymbol: tokenSymbol,
          displayBalance: amount,
          actualBalance: amount
        }
      })
      
      console.log('Balance update result:', balanceResult)
      
      // Record the injection as a transfer from admin
      const transferResult = await tx.transfer.create({
        data: {
          fromUserId: adminUser.id,
          fromAddress: adminUser.walletAddress || 'admin',
          toUserId: targetUser.id,
          toAddress: walletAddress,
          tokenSymbol,
          amount,
          status: 'completed',
          txHash,
          // Store additional metadata for admin injections
          metadata: {
            type: 'admin_injection',
            message: message || 'Admin token injection',
            injectedBy: adminUser.id
          }
        }
      })
      
      console.log('Transfer creation result:', transferResult)
    })
    
    // Verify the injection was successful by checking the updated balance
    const updatedBalance = await db.userTokenBalance.findUnique({
      where: {
        userId_tokenSymbol: {
          userId: targetUser.id,
          tokenSymbol: tokenSymbol
        }
      }
    })
    
    console.log('Updated balance after injection:', updatedBalance)
    console.log('Balance details:', {
      userId: updatedBalance?.userId,
      tokenSymbol: updatedBalance?.tokenSymbol,
      displayBalance: updatedBalance?.displayBalance,
      actualBalance: updatedBalance?.actualBalance,
      createdAt: updatedBalance?.createdAt,
      updatedAt: updatedBalance?.updatedAt
    })
    
    // Also check if the transfer was created
    const createdTransfer = await db.transfer.findUnique({
      where: { txHash },
      include: {
        fromUser: {
          select: { id: true, email: true }
        },
        toUser: {
          select: { id: true, email: true }
        }
      }
    })
    
    console.log('Created transfer:', createdTransfer)
    
    console.log('Token injection completed successfully')
    
    return NextResponse.json({
      message: 'Token injection completed successfully',
      injection: {
        toWallet: walletAddress,
        tokenSymbol,
        amount,
        txHash,
        injectedBy: adminUser.id,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error processing token injection:', error)
    
    if (error instanceof z.ZodError) {
      console.log('Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Invalid injection data', details: error.issues },
        { status: 400 }
      )
    }
    
    // Return proper error response instead of fallback
    console.error('Database error during injection:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to process injection', details: errorMessage },
      { status: 500 }
    )
  }
}

// GET /api/admin/inject - Get injection history (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminId = request.headers.get('x-admin-id')
    if (!adminId || adminId !== 'admin-user-id') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      )
    }
    
    // Get admin user to verify role
    const adminUser = await db.user.findUnique({
      where: { id: adminId }
    })
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      )
    }
    
    // Get all transfers from admin and filter for injections
    const allTransfers = await db.transfer.findMany({
      where: {
        fromUserId: adminId
      },
      include: {
        toUser: {
          select: {
            id: true,
            email: true,
            walletAddress: true
          }
        },
        token: {
          select: {
            symbol: true,
            name: true,
            logo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })
    
    // Filter for admin injections in code
    const injections = allTransfers.filter(transfer => {
      const metadata = transfer.metadata as any
      return metadata && metadata.type === 'admin_injection'
    })
    
    // Format injections for response
    const formattedInjections = injections.map(injection => ({
      id: injection.id,
      toWallet: injection.toAddress,
      toUser: injection.toUser,
      tokenSymbol: injection.tokenSymbol,
      tokenName: injection.token.name,
      tokenLogo: injection.token.logo,
      amount: injection.amount,
      message: typeof injection.metadata === 'object' && injection.metadata !== null && 'message' in injection.metadata 
        ? (injection.metadata as any).message 
        : 'Admin token injection',
      txHash: injection.txHash,
      createdAt: injection.createdAt,
      injectedBy: typeof injection.metadata === 'object' && injection.metadata !== null && 'injectedBy' in injection.metadata 
        ? (injection.metadata as any).injectedBy 
        : undefined
    }))
    
    return NextResponse.json(formattedInjections)
    
  } catch (error) {
    console.error('Error fetching injection history:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: 'Failed to fetch injection history', details: errorMessage },
      { status: 500 }
    )
  }
}

// Generate a cryptographically secure transaction hash
function generateTxHash(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  
  let hash = '0x'
  for (let i = 0; i < array.length; i++) {
    hash += array[i].toString(16).padStart(2, '0')
  }
  return hash
}