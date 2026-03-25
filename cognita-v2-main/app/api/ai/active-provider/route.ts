import { NextResponse } from 'next/server'
import { selectActiveProvider } from '@/lib/ai-provider-manager'

// Public endpoint — users can call this to see which AI is active
export async function GET() {
  try {
    const p = await selectActiveProvider()
    return NextResponse.json({
      name: p.provider_name,
      displayName: p.display_name,
      isGroq: p.provider_name === 'groq',
    })
  } catch {
    return NextResponse.json({ name: 'unknown', displayName: 'Bilinmiyor', isGroq: false })
  }
}
