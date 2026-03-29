import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServiceSupabase } from '@/lib/auth'
import { exportSchema } from '@/lib/validation'
import { errorResponse } from '@/lib/api-utils'

function toMarkdown(rows: Array<{ text: string; note?: string; books?: { title?: string } | null }>) {
  const lines = ['# Highlights Export', '']
  for (const row of rows) {
    lines.push(`## ${row.books?.title || 'Kitap'}`)
    lines.push(`> ${row.text}`)
    if (row.note) lines.push(`Not: ${row.note}`)
    lines.push('')
  }
  return lines.join('\n')
}

function toTxt(rows: Array<{ text: string; note?: string; books?: { title?: string } | null }>) {
  return rows.map((row) => `${row.books?.title || 'Kitap'}\n- ${row.text}${row.note ? `\n  Not: ${row.note}` : ''}`).join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = exportSchema.parse(await req.json())
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('highlights')
      .select('text, note, page_number, books(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = (data || []) as Array<{ text: string; note?: string; page_number?: number; books?: { title?: string } | null }>

    if (body.format === 'json') {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="cognita-export.json"',
        },
      })
    }

    if (body.format === 'txt') {
      return new NextResponse(toTxt(rows), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cognita-export.txt"',
        },
      })
    }

    const markdown = toMarkdown(rows)
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cognita-export.md"',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
