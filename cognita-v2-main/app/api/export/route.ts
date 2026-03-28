import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyUser(token: string) {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

function toMarkdown(rows: any[]) {
  const lines = ['# Highlights Export', '']
  for (const row of rows) {
    lines.push(`## ${row.books?.title || 'Kitap'}`)
    lines.push(`> ${row.text}`)
    if (row.note) lines.push(`Not: ${row.note}`)
    lines.push('')
  }
  return lines.join('\n')
}

function toTxt(rows: any[]) {
  return rows.map((row) => `${row.books?.title || 'Kitap'}\n- ${row.text}${row.note ? `\n  Not: ${row.note}` : ''}`).join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { format } = await req.json()
    const sb = getServiceSupabase()
    const { data, error } = await sb
      .from('highlights')
      .select('text, note, page_number, books(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const rows = data || []

    if (format === 'json') {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="cognita-export.json"',
        },
      })
    }

    if (format === 'txt') {
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
