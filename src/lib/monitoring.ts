import { NextRequest, NextResponse } from 'next/server'

// Production monitoring middleware
export async function monitoringMiddleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Log request details
  console.log({
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    referer: request.headers.get('referer'),
  })
  
  // Add performance monitoring header
  const response = NextResponse.next()
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
  
  return response
}

// Error tracking utility
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// Monitoring utilities
export const monitoring = {
  // Track API performance
  trackApiCall: (endpoint: string, duration: number, status: number) => {
    console.log({
      type: 'api_performance',
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString(),
    })
  },
  
  // Track errors
  trackError: (error: Error, context?: any) => {
    console.error({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    })
  },
  
  // Track user actions
  trackUserAction: (action: string, userId?: string, metadata?: any) => {
    console.log({
      type: 'user_action',
      action,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
    })
  },
  
  // Track system health
  trackHealth: (component: string, status: 'healthy' | 'degraded' | 'down', metrics?: any) => {
    console.log({
      type: 'health_check',
      component,
      status,
      metrics,
      timestamp: new Date().toISOString(),
    })
  },
}

// Health check endpoint
export async function healthCheck() {
  const checks = {
    database: 'unknown',
    api: 'unknown',
    externalServices: 'unknown',
  }
  
  // Check database
  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
    checks.database = 'healthy'
  } catch (error) {
    checks.database = 'down'
    monitoring.trackError(error as Error, { component: 'database' })
  }
  
  // Check external services (CoinGecko)
  try {
    const { coinGeckoService } = await import('@/lib/coingecko')
    await coinGeckoService.getPrices()
    checks.externalServices = 'healthy'
  } catch (error) {
    checks.externalServices = 'degraded'
    monitoring.trackError(error as Error, { component: 'coingecko' })
  }
  
  const overallStatus = Object.values(checks).every(check => check === 'healthy') 
    ? 'healthy' 
    : Object.values(checks).some(check => check === 'down') 
      ? 'down' 
      : 'degraded'
  
  monitoring.trackHealth('system', overallStatus, checks)
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
  }
}