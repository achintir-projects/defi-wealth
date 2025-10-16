"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, CheckCircle, AlertCircle, Loader2, Copy, Download } from 'lucide-react'
import QRCode from 'qrcode'

interface TokenBalance {
  symbol: string
  name: string
  logo?: string
  balance: number
  price: number
  value: number
  decimals: number
}

interface TransferFormProps {
  onTransferComplete?: () => void
  walletAddress?: string
}

export default function TransferForm({ onTransferComplete, walletAddress }: TransferFormProps) {
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    fetchTokens()
  }, [walletAddress]) // Re-fetch when wallet address changes

  const fetchTokens = async () => {
    try {
      let response
      if (walletAddress) {
        // Use wallet-specific API if we have a wallet address
        response = await fetch(`/api/wallet?address=${encodeURIComponent(walletAddress)}`)
      } else {
        // Fallback to default portfolio API
        response = await fetch('/api/portfolio')
      }
      
      if (response.ok) {
        const portfolio = await response.json()
        console.log('TransferForm received portfolio data:', portfolio)
        // Only show tokens that have a positive balance
        const tokensWithBalance = (portfolio.tokens || []).filter(token => token.balance > 0)
        console.log('Tokens with positive balance:', tokensWithBalance)
        setTokens(tokensWithBalance)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
    }
  }

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken)

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedToken || !amount || !recipientAddress) {
      setMessage('Please fill in all fields')
      setStatus('error')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage('Please enter a valid amount')
      setStatus('error')
      return
    }

    if (selectedTokenData && amountNum > selectedTokenData.balance) {
      setMessage('Insufficient balance')
      setStatus('error')
      return
    }

    // Validate Ethereum address format
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
          'x-wallet-address': walletAddress || ''
        },
        body: JSON.stringify({
          toAddress: recipientAddress,
          tokenSymbol: selectedToken,
          amount: amountNum,
        }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('Transfer completed successfully!')
        
        // Reset form
        setAmount('')
        setRecipientAddress('')
        setSelectedToken('')
        
        // Refresh tokens
        await fetchTokens()
        
        // Force refresh prices to get latest rates
        try {
          await fetch('/api/admin/refresh-prices', { method: 'POST' })
        } catch (error) {
          console.log('Price refresh failed, but transfer completed successfully')
        }
        
        // Small delay to ensure database transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Notify parent component
        if (onTransferComplete) {
          onTransferComplete()
        }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage('Address copied to clipboard!')
    setStatus('success')
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 2000)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Crypto
        </CardTitle>
        <CardDescription>
          Transfer tokens from your portfolio to any wallet address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleTransfer} className="space-y-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label htmlFor="token">Select Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue placeholder={tokens.length === 0 ? "No tokens available" : "Choose a token"} />
              </SelectTrigger>
              <SelectContent>
                {tokens.length > 0 ? (
                  tokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={token.logo} alt={token.symbol} />
                          <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatNumber(token.balance)} available
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No tokens available to send
                  </div>
                )}
              </SelectContent>
            </Select>
            {tokens.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You don't have any tokens with a positive balance in your portfolio.
              </p>
            )}
          </div>

          {/* Available Balance */}
          {selectedTokenData && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Available Balance:</span>
                <div className="text-right">
                  <div className="font-medium">
                    {formatNumber(selectedTokenData.balance, selectedTokenData.decimals)} {selectedTokenData.symbol}
                  </div>
                  <div className="text-muted-foreground">
                    {formatCurrency(selectedTokenData.value)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!selectedToken}
              />
              {selectedTokenData && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Badge variant="outline">{selectedTokenData.symbol}</Badge>
                </div>
              )}
            </div>
            {selectedTokenData && amount && (
              <div className="text-sm text-muted-foreground">
                ≈ {formatCurrency(parseFloat(amount) * selectedTokenData.price)}
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
            <p className="text-xs text-muted-foreground">
              Enter the recipient's wallet address (0x...)
            </p>
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
            disabled={tokens.length === 0 || !selectedToken || !amount || !recipientAddress || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {selectedTokenData?.symbol}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}