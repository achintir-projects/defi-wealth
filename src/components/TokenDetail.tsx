"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Send, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Share,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3
} from 'lucide-react'
import QRCode from 'qrcode'

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

interface TokenDetailProps {
  token: TokenBalance
  walletAddress?: string
  onBack: () => void
  onTransferComplete: () => void
}

export default function TokenDetail({ token, walletAddress, onBack, onTransferComplete }: TokenDetailProps) {
  const [sendAmount, setSendAmount] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'send' | 'receive'>('details')

  useEffect(() => {
    if (walletAddress && token) {
      generateTokenQRCode()
    }
  }, [walletAddress, token])

  const generateTokenQRCode = async () => {
    if (!walletAddress || !token) return

    try {
      const qrData = {
        address: walletAddress,
        token: token.symbol,
        network: 'offchain-wallet',
        app: 'Crypto Wealth Wallet'
      }
      
      const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sendAmount || !recipientAddress) {
      setMessage('Please fill in all fields')
      setStatus('error')
      return
    }

    const amountNum = parseFloat(sendAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage('Please enter a valid amount')
      setStatus('error')
      return
    }

    if (amountNum > token.balance) {
      setMessage('Insufficient balance')
      setStatus('error')
      return
    }

    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setMessage('Please enter a valid wallet address')
      setStatus('error')
      return
    }

    setLoading(true)
    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toAddress: recipientAddress,
          tokenSymbol: token.symbol,
          amount: amountNum,
        }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('Transfer completed successfully!')
        setSendAmount('')
        setRecipientAddress('')
        onTransferComplete()
      } else {
        const error = await response.json()
        setMessage(error.error || 'Transfer failed')
        setStatus('error')
      }
    } catch (error) {
      console.error('Error processing transfer:', error)
      setMessage('Network error. Please try again.')
      setStatus('error')
    } finally {
      setLoading(false)
    }
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

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return
    
    const link = document.createElement('a')
    link.download = `${token.symbol}-wallet-qr.png`
    link.href = qrCodeDataUrl
    link.click()
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

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'percent',
      signDisplay: 'always'
    }).format(value / 100)
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={token.logo} alt={token.symbol} />
                <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{token.name}</h1>
                <p className="text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
          </div>
          <Badge 
            variant={token.change24h >= 0 ? "default" : "destructive"}
            className="text-sm"
          >
            {formatPercentage(token.change24h)}
          </Badge>
        </div>

        {/* Token Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(token.balance, token.decimals)} {token.symbol}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(token.value)} USD
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(token.price)}
              </div>
              <p className="text-xs text-muted-foreground">
                per {token.symbol}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Change</CardTitle>
              {token.change24h >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(token.change24h)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(token.value * (token.change24h / 100))} USD
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'details' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('details')}
          >
            Details
          </Button>
          <Button
            variant={activeTab === 'send' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('send')}
          >
            Send
          </Button>
          <Button
            variant={activeTab === 'receive' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('receive')}
          >
            Receive
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Token Information</CardTitle>
              <CardDescription>
                Detailed information about your {token.name} holdings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Token Name</Label>
                  <p className="text-sm text-muted-foreground">{token.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Symbol</Label>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Decimals</Label>
                  <p className="text-sm text-muted-foreground">{token.decimals}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Price</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(token.price)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium">Wallet Address</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {walletAddress ? formatAddress(walletAddress) : 'Not available'}
                  </code>
                  {walletAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(walletAddress)}
                    >
                      {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => setActiveTab('send')}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send {token.symbol}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setActiveTab('receive')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Receive {token.symbol}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'send' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send {token.symbol}
              </CardTitle>
              <CardDescription>
                Transfer {token.symbol} to any wallet address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                {/* Available Balance */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Available Balance:</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatNumber(token.balance, token.decimals)} {token.symbol}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(token.value)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.00000001"
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Badge variant="outline">{token.symbol}</Badge>
                    </div>
                  </div>
                  {sendAmount && (
                    <div className="text-sm text-muted-foreground">
                      ≈ {formatCurrency(parseFloat(sendAmount) * token.price)}
                    </div>
                  )}
                </div>

                {/* Recipient Address */}
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Wallet Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </div>

                {/* Status Messages */}
                {status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                {status === 'success' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!sendAmount || !recipientAddress || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send {token.symbol}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'receive' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Receive {token.symbol}
              </CardTitle>
              <CardDescription>
                Share your wallet address to receive {token.symbol}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wallet Address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Your Wallet Address</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm break-all">
                      {walletAddress}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(walletAddress || '')}
                      className="ml-2 flex-shrink-0"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">QR Code</Label>
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt={`${token.symbol} Wallet QR Code`} 
                        className="rounded"
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] bg-muted rounded flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">Generating...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan this QR code to get your wallet address for {token.symbol}
                  </p>
                  <Button
                    variant="outline"
                    onClick={downloadQRCode}
                    className="w-full"
                    disabled={!qrCodeDataUrl}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">How to Receive {token.symbol}</Label>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Share your wallet address or QR code with the sender</p>
                  <p>• Sender can use your address to send {token.symbol}</p>
                  <p>• Tokens will appear in your portfolio instantly</p>
                  <p>• All transfers are internal and off-chain</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}