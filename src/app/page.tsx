"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { 
  ArrowRight, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Send, 
  Plus, 
  Settings, 
  Share, 
  QrCode,
  Wallet,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Hash,
  Flame,
  BarChart3,
  Activity,
  Shield
} from 'lucide-react'
import TransferForm from '@/components/TransferForm'
import TransactionHistory from '@/components/TransactionHistory'
import ReceiveForm from '@/components/ReceiveForm'
import TokenDetail from '@/components/TokenDetail'
import AppLoader from '@/components/AppLoader'
import { generateWalletAddress, isValidEthereumAddress, formatAddress } from '@/lib/walletUtils'

interface TokenBalance {
  symbol: string
  name: string
  logo?: string
  balance: number
  price: number
  value: number
  change24h: number
  decimals: number
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

interface Portfolio {
  totalValue: number
  totalChange24h: number
  tokens: TokenBalance[]
  user: {
    role: string
    walletAddress?: string
  }
}

interface TrendingToken {
  symbol: string
  name: string
  logo: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  sparkline: number[]
  rank: number
  category: string
}

export default function Home() {
  return (
    <AppLoader>
      <HomeContent />
    </AppLoader>
  )
}

function HomeContent() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showWalletDialog, setShowWalletDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [importWalletAddress, setImportWalletAddress] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [savedWallets, setSavedWallets] = useState<string[]>([])
  const [pricesSource, setPricesSource] = useState<'realtime' | 'fallback'>('fallback')

  const refreshData = async () => {
    console.log('Refreshing data...')
    setRefreshKey(prev => prev + 1)
    
    // Clear cached portfolio data to ensure fresh fetch
    setPortfolio(null)
    setLoading(true)
    
    // Force refresh prices and check source
    try {
      const response = await fetch('/api/admin/refresh-prices', { method: 'POST' })
      if (response.ok) {
        // Try to get price source info
        try {
          const walletResponse = await fetch('/api/wallet?address=dummy', { 
            headers: { 'x-wallet-address': 'dummy' }
          })
          if (walletResponse.ok) {
            const data = await walletResponse.json()
            // Check if we have real-time price data
            if (data.tokens && data.tokens.length > 0) {
              const firstToken = data.tokens[0]
              if (firstToken.lastUpdated && firstToken.marketCap > 0) {
                setPricesSource('realtime')
              } else {
                setPricesSource('fallback')
              }
            }
          }
        } catch (error) {
          console.log('Could not determine price source, using fallback')
          setPricesSource('fallback')
        }
      }
    } catch (error) {
      console.log('Price refresh failed, but continuing with data refresh')
      setPricesSource('fallback')
    }
    
    // Small delay to ensure price refresh is complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    fetchPortfolio()
    fetchTrending()
  }

  const fetchTrending = async () => {
    setTrendingLoading(true)
    try {
      const response = await fetch('/api/trending')
      if (response.ok) {
        const data = await response.json()
        setTrendingTokens(data.trending || [])
      } else {
        console.error('Failed to fetch trending tokens:', response.status, response.statusText)
        setTrendingTokens([]) // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching trending tokens:', error)
      setTrendingTokens([]) // Set empty array on error
    } finally {
      setTrendingLoading(false)
    }
  }

  useEffect(() => {
    // Load saved wallets from localStorage
    const saved = localStorage.getItem('savedWallets')
    if (saved) {
      setSavedWallets(JSON.parse(saved))
    }
    
    // Check for existing wallet address
    const existingWallet = localStorage.getItem('currentWalletAddress')
    const connected = localStorage.getItem('walletConnected') === 'true'
    
    if (existingWallet && connected) {
      setWalletConnected(true)
    }
    
    fetchPortfolio()
    fetchTrending()
  }, [refreshKey])

  const fetchPortfolio = async () => {
    setLoading(true)
    try {
      const currentWalletAddress = localStorage.getItem('currentWalletAddress')
      
      console.log('Fetching portfolio for wallet address:', currentWalletAddress)
      
      let response
      if (currentWalletAddress) {
        // Use wallet-specific API if we have a saved wallet address
        const apiUrl = `/api/wallet?address=${encodeURIComponent(currentWalletAddress)}`
        console.log('Using wallet API:', apiUrl)
        response = await fetch(apiUrl)
        console.log('Wallet API response status:', response.status)
      } else {
        // Fallback to default portfolio API
        console.log('Using default portfolio API')
        response = await fetch('/api/portfolio')
        console.log('Default portfolio API response status:', response.status)
      }
      
      if (response.ok) {
        const portfolioData = await response.json()
        console.log('Portfolio data received:', portfolioData)
        
        // Validate the portfolio data structure
        if (!portfolioData || !portfolioData.tokens || !Array.isArray(portfolioData.tokens)) {
          console.error('Invalid portfolio data structure:', portfolioData)
          throw new Error('Invalid portfolio data structure')
        }
        
        // Check if we have real-time price data
        if (portfolioData.tokens && portfolioData.tokens.length > 0) {
          const firstToken = portfolioData.tokens[0]
          if (firstToken.lastUpdated && firstToken.marketCap > 0) {
            setPricesSource('realtime')
            console.log('Detected real-time price data')
          } else {
            setPricesSource('fallback')
            console.log('Using fallback price data')
          }
        }
        
        setPortfolio(portfolioData)
        
        // Update the current wallet address if it's different from what we have stored
        if (portfolioData.user?.walletAddress && portfolioData.user.walletAddress !== currentWalletAddress) {
          console.log('Updating wallet address from:', currentWalletAddress, 'to:', portfolioData.user.walletAddress)
          localStorage.setItem('currentWalletAddress', portfolioData.user.walletAddress)
        }
      } else {
        console.error('Failed to fetch portfolio:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        // Set portfolio to null to trigger error state
        setPortfolio(null)
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
      // Set portfolio to null to trigger error state, but don't keep loading forever
      setPortfolio(null)
    } finally {
      setLoading(false)
    }
  }

  const connectWallet = async () => {
    setConnecting(true)
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Check if we already have a saved wallet address
      let walletAddress = localStorage.getItem('currentWalletAddress')
      
      if (!walletAddress) {
        // Generate new cryptographically secure wallet address
        walletAddress = generateWalletAddress()
        
        // Save the new wallet address
        localStorage.setItem('currentWalletAddress', walletAddress)
        
        // Add to saved wallets list
        const updatedSavedWallets = [...savedWallets, walletAddress]
        setSavedWallets(updatedSavedWallets)
        localStorage.setItem('savedWallets', JSON.stringify(updatedSavedWallets))
        
        console.log('Generated new wallet address:', walletAddress)
      }
      
      setWalletConnected(true)
      localStorage.setItem('walletConnected', 'true')
      setShowWalletDialog(false)
      
      // Clear any cached portfolio data to ensure fresh fetch
      setPortfolio(null)
      
      // Refresh portfolio to get the correct wallet address
      refreshData()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletConnected(false)
    localStorage.removeItem('walletConnected')
    setSelectedToken(null)
    // Keep the wallet address saved for future reconnection
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const importWallet = async () => {
    if (!importWalletAddress.trim()) {
      alert('Please enter a wallet address')
      return
    }
    
    // Basic validation for Ethereum address format
    if (!isValidEthereumAddress(importWalletAddress)) {
      alert('Please enter a valid Ethereum address (must start with 0x and be 42 characters long)')
      return
    }
    
    try {
      // Save the imported wallet address
      localStorage.setItem('currentWalletAddress', importWalletAddress)
      
      // Add to saved wallets list if not already there
      if (!savedWallets.includes(importWalletAddress)) {
        const updatedSavedWallets = [...savedWallets, importWalletAddress]
        setSavedWallets(updatedSavedWallets)
        localStorage.setItem('savedWallets', JSON.stringify(updatedSavedWallets))
      }
      
      setWalletConnected(true)
      localStorage.setItem('walletConnected', 'true')
      setImportWalletAddress('')
      setShowImportDialog(false)
      setShowWalletDialog(false)
      
      // Refresh portfolio to get the correct wallet address
      refreshData()
    } catch (error) {
      console.error('Failed to import wallet:', error)
      alert('Failed to import wallet address')
    }
  }

  const connectToSavedWallet = (walletAddress: string) => {
    localStorage.setItem('currentWalletAddress', walletAddress)
    setWalletConnected(true)
    localStorage.setItem('walletConnected', 'true')
    setShowWalletDialog(false)
    
    // Refresh portfolio to get the correct wallet address
    refreshData()
  }

  const formatWalletAddress = (address: string) => {
    return formatAddress(address)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'percent',
      signDisplay: 'always'
    }).format(value / 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
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
                  <div key={i} className="flex items-center justify-between">
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
        </div>
      </div>
    )
  }

  // Show Token Detail view if a token is selected
  if (selectedToken) {
    return (
      <TokenDetail
        token={selectedToken}
        walletAddress={portfolio?.user.walletAddress}
        onBack={() => setSelectedToken(null)}
        onTransferComplete={refreshData}
      />
    )
  }

  // Show wallet connection screen if wallet is not connected
  if (!walletConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40"></div>
        <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-black/80 dark:bg-black/90 border-yellow-500/30">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-full">
                <Wallet className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl gradient-text">
              DeFi Wealth Manager
            </CardTitle>
            <CardDescription className="text-gray-300">
              Connect your wallet to start managing your cryptocurrency portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold py-3" 
              size="lg"
              onClick={() => setShowWalletDialog(true)}
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
            
            <Button 
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3" 
              size="lg"
              onClick={() => setShowImportDialog(true)}
            >
              <Copy className="mr-2 h-5 w-5" />
              Import Existing Wallet
            </Button>
            
            <Button 
              className="w-full bg-gradient-to-r from-yellow-700 to-yellow-800 hover:from-yellow-800 hover:to-yellow-900 text-white font-semibold py-3" 
              size="lg"
              onClick={() => window.location.href = '/admin-login'}
            >
              <Shield className="mr-2 h-5 w-5" />
              Admin Login
            </Button>
            
            <div className="text-center text-sm text-gray-400">
              <p>Secure, off-chain wallet management</p>
              <p>No blockchain fees required</p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
          <DialogContent className="backdrop-blur-sm bg-black/95 dark:bg-black/95 border-yellow-500/30">
            <DialogHeader>
              <DialogTitle className="gradient-text">
                Connect Your Wallet
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Choose how you'd like to connect to your wallet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold" 
                variant="default"
                onClick={connectWallet}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Create New Wallet
                  </>
                )}
              </Button>
              
              <Button 
                className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" 
                variant="outline"
                disabled={connecting}
                onClick={() => {
                  setShowImportDialog(true)
                  setShowWalletDialog(false)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Import Existing Wallet
              </Button>
              
              {savedWallets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Saved Wallets</h4>
                  {savedWallets.map((wallet, index) => (
                    <Button
                      key={index}
                      className="w-full justify-start text-left border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      variant="outline"
                      disabled={connecting}
                      onClick={() => connectToSavedWallet(wallet)}
                    >
                      <Wallet className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{formatWalletAddress(wallet)}</span>
                    </Button>
                  ))}
                </div>
              )}
              
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  This is an off-chain wallet for demonstration purposes. No real cryptocurrency is stored or transferred.
                </AlertDescription>
              </Alert>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Import Existing Wallet
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Enter your existing wallet address to import it
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="walletAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Wallet Address
                </label>
                <Input
                  id="walletAddress"
                  placeholder="0x..."
                  value={importWalletAddress}
                  onChange={(e) => setImportWalletAddress(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold" 
                  variant="default"
                  onClick={importWallet}
                  disabled={!importWalletAddress.trim()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Import Wallet
                </Button>
                
                <Button 
                  className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800" 
                  variant="outline"
                  onClick={() => {
                    setShowImportDialog(false)
                    setShowWalletDialog(true)
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Enter a valid Ethereum address (42 characters starting with 0x). This will allow you to access any tokens that have been injected to this address.
                </AlertDescription>
              </Alert>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen glass-container">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-lg">
            <h1 className="text-5xl font-bold gradient-text">
              Portfolio
            </h1>
            <p className="text-white/90 text-lg mt-2">Your crypto wealth dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="crypto-card" onClick={refreshData} title="Refresh">
              <Activity className="h-4 w-4" />
            </Button>
            {/* Price source indicator */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
              <div className={`w-2 h-2 rounded-full ${pricesSource === 'realtime' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {pricesSource === 'realtime' ? 'Live' : 'Demo'}
              </span>
            </div>
            <Button variant="outline" size="icon" className="crypto-card">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="crypto-card">
              <Send className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="crypto-card">
              <QrCode className="h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="crypto-card">
              <a href="/explorer">
                <Hash className="h-4 w-4" />
              </a>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="crypto-card"
              onClick={() => window.location.href = '/admin-login'}
              title="Admin Login"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
              onClick={() => window.location.href = '/admin-login'}
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Login
            </Button>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="/logo.svg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={disconnectWallet}>
                <Wallet className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Wallet Address Bar */}
        {portfolio?.user.walletAddress && (
          <Card className="balance-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-mono text-sm">
                      {formatWalletAddress(portfolio.user.walletAddress)}
                    </div>
                    <div className="text-xs text-muted-foreground">Wallet Address</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(portfolio.user.walletAddress || '')}
                  disabled={!portfolio.user.walletAddress}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text-alt">
                {portfolio ? formatCurrency(portfolio.totalValue) : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolio && (
                  <span className="text-green-600">
                    {formatPercentage(portfolio.totalChange24h)} from last 24h
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tokens</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text-alt">
                {portfolio?.tokens.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card className="crypto-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold gradient-text-alt">2,847</div>
              <p className="text-xs text-muted-foreground">
                +180 new users today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="trending">
              <Flame className="h-4 w-4 mr-1" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="receive">Receive</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle>Your Assets</CardTitle>
                <CardDescription>
                  Your cryptocurrency portfolio with real-time values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio?.tokens.map((token) => (
                    <div 
                      key={token.symbol} 
                      className="crypto-card flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedToken(token)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="token-avatar">
                          <Avatar>
                            <AvatarImage src={token.logo} alt={token.symbol} />
                            <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="font-semibold">{token.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatNumber(token.balance)} {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold gradient-text-alt">
                          {formatCurrency(token.value)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(token.price)} @
                        </div>
                        <Badge 
                          variant={token.change24h >= 0 ? "default" : "destructive"}
                          className="text-xs mt-1"
                        >
                          {formatPercentage(token.change24h)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <Card className="crypto-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500 pulse-animation" />
                  Trending Tokens
                </CardTitle>
                <CardDescription>
                  Discover the hottest tokens in the market right now
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendingLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="crypto-card flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
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
                ) : (
                  <div className="space-y-4">
                    {trendingTokens.map((token) => (
                      <div 
                        key={token.symbol} 
                        className="crypto-card flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          // Find matching token in portfolio and select it
                          const portfolioToken = portfolio?.tokens.find(t => t.symbol === token.symbol)
                          if (portfolioToken) {
                            setSelectedToken(portfolioToken)
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="trending-rank flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold">
                              {token.rank}
                            </div>
                            <div className="token-avatar">
                              <Avatar>
                                <AvatarImage src={token.logo} alt={token.symbol} />
                                <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {token.name}
                              <Badge variant="secondary" className="text-xs">
                                {token.category}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold gradient-text-alt">
                            ${formatNumber(token.price, token.price < 1 ? 6 : 2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Vol: ${formatNumber(token.volume24h / 1000000, 1)}M
                          </div>
                          <Badge 
                            variant={token.change24h >= 0 ? "default" : "destructive"}
                            className="text-xs mt-1"
                          >
                            {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send">
            <TransferForm onTransferComplete={refreshData} walletAddress={portfolio?.user.walletAddress} />
          </TabsContent>

          <TabsContent value="receive">
            <ReceiveForm walletAddress={portfolio?.user.walletAddress} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}