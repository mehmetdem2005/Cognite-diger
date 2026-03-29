import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api-utils'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const UPSTREAM_TIMEOUT_MS = 30_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const upstream = await fetch(`${BACKEND_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    if (!upstream.ok || !upstream.body) {
      const message = await upstream.text().catch(() => 'Upstream error')
      return NextResponse.json({ error: message || 'Upstream error' }, { status: upstream.status || 500 })
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
