import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const upstream = await fetch(`${BACKEND_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
