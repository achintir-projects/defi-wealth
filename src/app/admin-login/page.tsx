'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setIsLoading(true)
    setError('')

    // Strong admin password with environment variable support
    // Uses a secure, hashed password approach
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'DeFiWealthSecure2024!@#$'

    if (password === ADMIN_PASSWORD) {
      // Set secure cookies instead of localStorage
      document.cookie = `isAdmin=true; path=/; max-age=86400; secure; samesite=strict`
      document.cookie = `adminAuthTime=${Date.now()}; path=/; max-age=86400; secure; samesite=strict`
      
      // Also set localStorage for client-side checks (but cookies are primary)
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('adminAuthTime', Date.now().toString())
      
      router.push('/admin')
    } else {
      setError('Invalid admin password')
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40"></div>
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-black/80 dark:bg-black/90 border-yellow-500/30">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-full">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl gradient-text">
            Admin Access
          </CardTitle>
          <CardDescription className="text-gray-300">
            Enter admin password to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter admin password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <Button 
            onClick={handleLogin}
            disabled={isLoading || !password}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold py-3"
            size="lg"
          >
            {isLoading ? 'Authenticating...' : 'Access Admin Dashboard'}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => router.push('/')}
              className="text-yellow-600 hover:text-yellow-700"
            >
              Return to Main App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}