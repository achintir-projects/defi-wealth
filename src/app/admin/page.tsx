'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Send, History, Settings, Shield, Wallet, Coins, Users, Search, Eye, Flag } from 'lucide-react'
import { toast } from 'sonner'

interface Token {
  symbol: string
  name: string
  logo: string
  decimals: number
}

interface Injection {
  id: string
  toWallet: string
  toUser?: {
    id: string
    email: string
    walletAddress: string
  }
  tokenSymbol: string
  tokenName: string
  tokenLogo: string
  amount: number
  message: string
  txHash: string
  createdAt: string
  injectedBy: string
}

interface WalletInfo {
  id: string
  walletAddress: string
  email: string
  createdAt: string
  lastActivity: string
  totalValue: number
  totalInjectedValue: number
  totalSentValue: number
  netFlow: number
  tokenCount: number
  sentTransferCount: number
  receivedTransferCount: number
  totalTransferCount: number
  tokenDistribution: Array<{
    symbol: string
    name: string
    balance: number
    value: number
    percentage: number
  }>
  walletType: 'generated' | 'imported'
  isFlagged: boolean
  flagReason?: string
  role: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('inject')
  const [walletAddress, setWalletAddress] = useState('')
  const [selectedToken, setSelectedToken] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [injections, setInjections] = useState<Injection[]>([])
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [systemStats, setSystemStats] = useState<any>(null)
  const [walletSearchTerm, setWalletSearchTerm] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Available tokens for injection
  const availableTokens: Token[] = [
    { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400', decimals: 8 },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', logo: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661', decimals: 6 },
    { symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970', decimals: 18 },
    { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756', decimals: 9 },
    { symbol: 'ADA', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/Cardano.png?1696502090', decimals: 6 },
    { symbol: 'DOT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot_new_logo.png?1696503150', decimals: 10 },
    { symbol: 'XRP', name: 'Ripple', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442', decimals: 6 },
    { symbol: 'DOGE', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501449', decimals: 8 },
    { symbol: 'AVAX', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_W_Text.svg?1696503360', decimals: 18 },
  ]

  useEffect(() => {
    // Check if user is authenticated as admin with proper session validation
    const checkAuth = () => {
      const isAdmin = localStorage.getItem('isAdmin') === 'true'
      const authTime = localStorage.getItem('adminAuthTime')
      
      // Check if session is valid (24 hours)
      const isValidSession = authTime && (Date.now() - parseInt(authTime)) < 24 * 60 * 60 * 1000
      
      if (isAdmin && isValidSession) {
        setIsAuthenticated(true)
        setTokens(availableTokens)
        loadInjectionHistory()
        loadWallets()
      } else {
        // Clear invalid session
        localStorage.removeItem('isAdmin')
        localStorage.removeItem('adminAuthTime')
        setIsAuthenticated(false)
      }
    }
    
    checkAuth()
  }, [])

  const loadInjectionHistory = async () => {
    try {
      const response = await fetch('/api/admin/inject', {
        headers: {
          'x-admin-id': 'admin-user-id'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInjections(data)
      }
    } catch (error) {
      console.error('Failed to load injection history:', error)
    }
  }

  const loadWallets = async () => {
    try {
      const response = await fetch('/api/admin/wallets', {
        headers: {
          'x-admin-id': 'admin-user-id'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setWallets(data.wallets || [])
        setSystemStats(data.systemStats || null)
        console.log('System stats loaded:', data.systemStats)
      }
    } catch (error) {
      console.error('Failed to load wallets:', error)
    }
  }

  const handleInject = async () => {
    if (!walletAddress || !selectedToken || !amount) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Attempting token injection...', {
        walletAddress,
        tokenSymbol: selectedToken,
        amount: parseFloat(amount)
      })

      const response = await fetch('/api/admin/inject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': 'admin-user-id'
        },
        body: JSON.stringify({
          walletAddress,
          tokenSymbol: selectedToken,
          amount: parseFloat(amount),
          message: message || 'Admin token injection'
        })
      })

      console.log('Injection response status:', response.status)
      
      const result = await response.json()
      console.log('Injection response:', result)
      
      if (response.ok) {
        toast.success(result.message || 'Token injection completed successfully!')
        
        // Reset form
        setWalletAddress('')
        setSelectedToken('')
        setAmount('')
        setMessage('')
        
        // Reload injection history
        setTimeout(() => {
          loadInjectionHistory()
          loadWallets() // Also reload wallets to show updated data
        }, 1000) // Small delay to ensure serverless function has processed
      } else {
        console.error('Injection failed:', result)
        toast.error(result.error || 'Failed to inject tokens')
      }
    } catch (error) {
      console.error('Injection error:', error)
      toast.error('Network error: Failed to inject tokens. This might be due to serverless environment limitations.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatAmount = (amount: number, decimals: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(decimals, 8)
    }).format(amount)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const filteredWallets = wallets.filter(wallet => {
    if (!walletSearchTerm) return true
    const searchTerm = walletSearchTerm.toLowerCase()
    return (
      wallet.walletAddress.toLowerCase().includes(searchTerm) ||
      wallet.email.toLowerCase().includes(searchTerm)
    )
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              This page is only accessible to administrators. Please log in with your admin credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.href = '/admin-login'}
              className="w-full"
            >
              Go to Admin Login
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return to Main App
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Admin Dashboard</h1>
              <p className="text-muted-foreground">Token injection and system management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                // Clear cookies and localStorage
                document.cookie = 'isAdmin=; path=/; max-age=0; secure; samesite=strict'
                document.cookie = 'adminAuthTime=; path=/; max-age=0; secure; samesite=strict'
                localStorage.removeItem('isAdmin')
                localStorage.removeItem('adminAuthTime')
                window.location.href = '/'
              }}
            >
              Exit Admin
            </Button>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Mode
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">{systemStats?.totalWallets || wallets.length}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.generatedWallets || 0} generated, {systemStats?.importedWallets || 0} imported
              </p>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">
                {systemStats ? formatCurrency(systemStats.totalSystemValue) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all wallets
              </p>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text">{systemStats?.totalTransfers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {systemStats?.flaggedWallets || 0} flagged wallets
              </p>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">
                {tokens.length} tokens available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inject" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Inject Tokens
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manage Wallets
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Injection History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inject" className="space-y-4">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Token Injection
                </CardTitle>
                <CardDescription>
                  Inject tokens to any wallet address. This will create a new user if the wallet doesn't exist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Recipient Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Select value={selectedToken} onValueChange={setSelectedToken}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <img
                              src={token.logo}
                              alt={token.name}
                              className="w-5 h-5 rounded-full"
                            />
                            {token.name} ({token.symbol})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a note about this injection..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleInject} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Injecting...' : 'Inject Tokens'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Wallet Management
                </CardTitle>
                <CardDescription>
                  View all wallets in the system including system-generated and imported wallets. 
                  Track total value, transfers, and token distribution for complete accounting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by wallet address or email..."
                      value={walletSearchTerm}
                      onChange={(e) => setWalletSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={loadWallets}
                    variant="outline"
                    size="sm"
                  >
                    Refresh
                  </Button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredWallets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {walletSearchTerm ? 'No wallets match your search' : 'No wallets found'}
                    </div>
                  ) : (
                    filteredWallets.map((wallet) => (
                      <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${wallet.walletType === 'imported' ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <Wallet className={`h-4 w-4 ${wallet.walletType === 'imported' ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {formatAddress(wallet.walletAddress)}
                              <Badge variant="outline" className="text-xs">
                                {wallet.walletType}
                              </Badge>
                              {wallet.role === 'admin' && (
                                <Badge variant="secondary" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {wallet.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(wallet.createdAt).toLocaleDateString()} • 
                              Last active: {new Date(wallet.lastActivity).toLocaleDateString()}
                            </div>
                            {wallet.tokenDistribution.length > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">Tokens:</span>
                                {wallet.tokenDistribution.slice(0, 3).map(token => (
                                  <Badge key={token.symbol} variant="outline" className="text-xs">
                                    {token.symbol} ({token.percentage.toFixed(1)}%)
                                  </Badge>
                                ))}
                                {wallet.tokenDistribution.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{wallet.tokenDistribution.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(wallet.totalValue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {wallet.tokenCount} tokens • {wallet.totalTransferCount} transfers
                          </div>
                          <div className="text-xs text-muted-foreground">
                            In: {formatCurrency(wallet.totalInjectedValue)} • 
                            Out: {formatCurrency(wallet.totalSentValue)} • 
                            Net: <span className={wallet.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(wallet.netFlow)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            {wallet.isFlagged && (
                              <Badge variant="destructive" className="text-xs">
                                <Flag className="h-3 w-3 mr-1" />
                                Flagged
                              </Badge>
                            )}
                            <Badge variant={wallet.totalTransferCount > 0 ? "default" : "secondary"} className="text-xs">
                              {wallet.totalTransferCount > 0 ? 'Active' : 'New'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle>Injection History</CardTitle>
                <CardDescription>
                  View all token injections performed by administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {injections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No injections found
                    </div>
                  ) : (
                    injections.map((injection) => (
                      <div key={injection.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <img
                            src={injection.tokenLogo}
                            alt={injection.tokenName}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="font-medium">
                              {formatAmount(injection.amount, 8)} {injection.tokenSymbol}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              To: {formatAddress(injection.toWallet)}
                              {injection.toUser && (
                                <span className="ml-2">({injection.toUser.email})</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {injection.message}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {new Date(injection.createdAt).toLocaleDateString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}