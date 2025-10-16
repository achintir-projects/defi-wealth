"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Transfer {
  id: string
  type: 'sent' | 'received'
  amount: number
  tokenSymbol: string
  tokenName: string
  tokenLogo?: string
  tokenDecimals: number
  counterparty: string
  counterpartyId: string
  status: string
  createdAt: string
  value: number
}

interface TransactionHistoryProps {
  refreshKey?: number
}

export default function TransactionHistory({ refreshKey }: TransactionHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransfers()
  }, [refreshKey])

  const fetchTransfers = async () => {
    try {
      // Get current wallet address from localStorage
      const walletAddress = localStorage.getItem('currentWalletAddress')
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (walletAddress) {
        headers['x-wallet-address'] = walletAddress
      }
      
      const response = await fetch('/api/transfers', { headers })
      if (response.ok) {
        const transfersData = await response.json()
        console.log('Received transfer history:', transfersData)
        setTransfers(transfersData || [])
      } else {
        console.error('Failed to fetch transfers:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent transfers and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transfers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent transfers and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your transfer history will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent transfers and activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  {transfer.type === 'sent' ? (
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                  ) : (
                    <ArrowDownLeft className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={transfer.tokenLogo} alt={transfer.tokenSymbol} />
                    <AvatarFallback>{transfer.tokenSymbol.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {transfer.type === 'sent' ? 'Sent to' : 'Received from'} {transfer.counterparty}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{formatDate(transfer.createdAt)}</span>
                      {getStatusIcon(transfer.status)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${transfer.type === 'sent' ? 'text-red-500' : 'text-green-500'}`}>
                  {transfer.type === 'sent' ? '-' : '+'}
                  {formatNumber(transfer.amount, transfer.tokenDecimals)} {transfer.tokenSymbol}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(transfer.value)}
                </div>
                <Badge 
                  variant={transfer.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs mt-1"
                >
                  {transfer.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}