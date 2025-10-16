"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppLoaderProps {
  children: React.ReactNode
}

export default function AppLoader({ children }: AppLoaderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // Reduced loading time to 2 seconds maximum

    return () => clearTimeout(timer)
  }, [])

  const handleRetry = () => {
    setIsLoading(true)
    setHasError(false)
    setRetryCount(prev => prev + 1)
    
    // Simulate retry
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-lg">Loading Application</CardTitle>
            <CardDescription>
              Please wait while we initialize your crypto wallet...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Initializing secure connection...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-lg">Application Error</CardTitle>
            <CardDescription>
              We encountered an issue while loading the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>This could be due to a temporary connection issue or missing dependencies.</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleRetry}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry ({retryCount})
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
                variant="outline"
              >
                Refresh Page
              </Button>
            </div>
            
            {retryCount >= 3 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  If the issue persists, please check your internet connection and try again later.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}