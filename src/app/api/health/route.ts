import { NextRequest, NextResponse } from 'next/server'
import { healthCheck } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const health = await healthCheck()
    
    const status = health.status === 'healthy' ? 200 : 
                   health.status === 'degraded' ? 503 : 503
    
    return NextResponse.json(health, { status })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, { status: 503 })
  }
}