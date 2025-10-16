"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Hash,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Transaction {
  id: string
  hash: string
  fromUserId: string
  toUserId: string
  fromAddress: string
  toAddress: string
  tokenSymbol: string
  amount: number
  status: 'completed' | 'pending' | 'failed'
  timestamp: string
  blockNumber: number
  gasUsed: number
  gasPrice: number
  tokenName: string
  tokenLogo?: string
}

interface TokenBalance {
  symbol: string
  name: string
  logo?: string
  price: number
  change24h: number
}

interface ExplorerStats {
  totalTransactions: number
  totalVolume: number
  activeUsers: number
  totalTokens: number
}

export default function Explorer() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [stats, setStats] = useState<ExplorerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tokenFilter, setTokenFilter] = useState<string>('all')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchExplorerData()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, statusFilter, tokenFilter])

  const fetchExplorerData = async () => {
    try {
      // Fetch transactions
      const [txResponse, portfolioResponse] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/portfolio')
      ])

      let enhancedTransactions: any[] = []
      
      if (txResponse.ok) {
        const txData = await txResponse.json()
        enhancedTransactions = txData.map((tx: any, index: number) => ({
          ...tx,
          hash: generateTransactionHash(tx),
          blockNumber: 1000000 + index,
          gasUsed: Math.floor(Math.random() * 50000) + 21000,
          gasPrice: Math.floor(Math.random() * 50) + 10,
          timestamp: tx.createdAt || new Date().toISOString()
        }))
        setTransactions(enhancedTransactions)
      }

      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setTokens(portfolioData.tokens || [])
        
        // Calculate stats
        const totalTransactions = enhancedTransactions?.length || 0
        const totalVolume = enhancedTransactions?.reduce((sum: number, tx: any) => {
          const token = portfolioData.tokens.find((t: any) => t.symbol === tx.tokenSymbol)
          return sum + (tx.amount * (token?.price || 0))
        }, 0) || 0
        
        setStats({
          totalTransactions,
          totalVolume,
          activeUsers: 3, // Demo users
          totalTokens: portfolioData.tokens?.length || 0
        })
      }
    } catch (error) {
      console.error('Error fetching explorer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTransactionHash = (tx: any): string => {
    const data = `${tx.fromUserId}-${tx.toUserId}-${tx.tokenSymbol}-${tx.amount}-${tx.createdAt}`
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
  }

  const filterTransactions = () => {
    let filtered = transactions

    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.fromAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.toAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }

    if (tokenFilter !== 'all') {
      filtered = filtered.filter(tx => tx.tokenSymbol === tokenFilter)
    }

    setFilteredTransactions(filtered)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center">
            <Skeleton className="h-12 w-48 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Crypto Wealth Explorer
              </h1>
              <p className="text-muted-foreground text-lg">
                Explore transactions, addresses, and tokens on the off-chain network
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  All time transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
                <p className="text-xs text-muted-foreground">
                  Total transaction volume
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Active wallet addresses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTokens}</div>
                <p className="text-xs text-muted-foreground">
                  Supported tokens
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Transaction Search
            </CardTitle>
            <CardDescription>
              Search transactions by hash, address, or token symbol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by hash, address, or token..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tokenFilter} onValueChange={setTokenFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  {tokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchExplorerData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest transactions on the off-chain network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(tx.status)}`} />
                        <span className="text-sm font-medium capitalize">{tx.status}</span>
                        <Badge variant="outline" className="text-xs">
                          Block #{tx.blockNumber}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(tx.timestamp)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>From</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-mono text-sm">{formatAddress(tx.fromAddress)}</div>
                            <div className="text-xs text-muted-foreground">From</div>
                          </div>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>To</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-mono text-sm">{formatAddress(tx.toAddress)}</div>
                            <div className="text-xs text-muted-foreground">To</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={tx.tokenLogo} alt={tx.tokenSymbol} />
                            <AvatarFallback>{tx.tokenSymbol.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">
                            {formatNumber(tx.amount)} {tx.tokenSymbol}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(tx.amount * (tokens.find(t => t.symbol === tx.tokenSymbol)?.price || 0))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Gas: {tx.gasUsed.toLocaleString()} @ {tx.gasPrice} Gwei</span>
                          <span>
                            Fee: {formatCurrency((tx.gasUsed * tx.gasPrice) / 1000000000)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {tx.hash.substring(0, 10)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(tx.hash, 'hash')}
                          >
                            {copied === 'hash' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}