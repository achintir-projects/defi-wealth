"use client"

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, Copy, CheckCircle, Share } from 'lucide-react'

interface ReceiveFormProps {
  walletAddress?: string
}

export default function ReceiveForm({ walletAddress }: ReceiveFormProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')

  useEffect(() => {
    if (walletAddress) {
      // Create QR code data with wallet address
      const qrData = {
        address: walletAddress,
        network: 'offchain-wallet',
        app: 'Crypto Wealth Wallet'
      }
      
      // Generate QR code as data URL
      QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeDataUrl)
      
      // Create shareable URL
      const url = `${window.location.origin}/send?to=${walletAddress}`
      setShareUrl(url)
    }
  }, [walletAddress])

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
    if (!qrCodeDataUrl || !walletAddress) return
    
    const link = document.createElement('a')
    link.download = `wallet-qr-${walletAddress.substring(0, 8)}.png`
    link.href = qrCodeDataUrl
    link.click()
  }

  const shareWallet = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wallet Address',
          text: `Send crypto to my wallet address: ${walletAddress}`,
          url: shareUrl,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to copying to clipboard
      copyToClipboard(shareUrl)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  if (!walletAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receive Crypto</CardTitle>
          <CardDescription>
            Your wallet address is not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Please make sure your wallet is properly initialized.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share className="h-5 w-5" />
          Receive Crypto
        </CardTitle>
        <CardDescription>
          Share your wallet address to receive tokens from others
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Your Wallet Address</Label>
            <Badge variant="outline">Off-Chain</Badge>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm break-all">
                {walletAddress}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletAddress)}
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
                  alt="Wallet QR Code" 
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
              Scan this QR code to get your wallet address
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

        {/* Share Options */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Share Options</Label>
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={shareWallet}
              className="w-full"
            >
              <Share className="mr-2 h-4 w-4" />
              Share Address
            </Button>
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Share URL:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(shareUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-1 break-all">
                {shareUrl}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">How to Receive</Label>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Share your wallet address or QR code with the sender</p>
            <p>• Sender can use your address in the Send tab</p>
            <p>• Tokens will appear in your portfolio instantly</p>
            <p>• All transfers are internal and off-chain</p>
          </div>
        </div>

        {/* Success Message */}
        {copied && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Address copied to clipboard!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}