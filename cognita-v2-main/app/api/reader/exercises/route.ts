import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI } from '@/lib/ai-provider-manager'

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function verifyUser(token: string) {
  const sb = getServiceSupabase()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

async function isAdmin(userId: string) {
  const sb = getServiceSupabase()
  const { data } = await sb.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const bookId = req.nextUrl.searchParams.get('book_id')
    const sectionKey = req.nextUrl.searchParams.get('section_key')
    if (!bookId) return NextResponse.json({ error: 'book_id gerekli' }, { status: 400 })

    const sb = getServiceSupabase()
    let query = sb.from('reader_exercises').select('*').eq('book_id', bookId).order('created_at', { ascending: false })
    if (sectionKey) query = query.eq('section_key', sectionKey)

    const { data: exercises, error: exError } = await query
    if (exError) return NextResponse.json({ error: exError.message }, { status: 500 })

    const ids = (exercises || []).map((e: any) => e.id)
    let attempts: any[] = []
    if (ids.length > 0) {
      const { data } = await sb
        .from('reader_exercise_attempts')
        .select('exercise_id,is_correct,score,attempted_at')
        .eq('user_id', user.id)
        .in('exercise_id', ids)
        .order('attempted_at', { ascending: false })
      attempts = data || []
    }

    return NextResponse.json({ exercises: exercises || [], attempts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const user = await verifyUser(token)
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const body = await req.json()
    const action = body.action || 'attempt'
    const sb = getServiceSupabase()

    if (action === 'attempt') {
      const exerciseId = body.exercise_id
      if (!exerciseId) return NextResponse.json({ error: 'exercise_id gerekli' }, { status: 400 })

      const userAnswer = body.user_answer ?? null
      let isCorrect: boolean | null = null
      let score: number | null = null
      let aiFeedback: string | null = null

      const { data: exercise } = await sb
        .from('reader_exercises')
        .select('id,exercise_type,answer_key,question')
        .eq('id', exerciseId)
        .single()

      if (!exercise) return NextResponse.json({ error: 'Egzersiz bulunamadi' }, { status: 404 })

      if (exercise.exercise_type === 'open_ended') {
        try {
          const result = await callAI({
            messages: [
              {
                role: 'user',
                content: `Asagidaki acik uclu cevap icin 0-100 arasi puan ve kisa geri bildirim ver. Sadece JSON don: {"score":number,"feedback":string}.\nSoru: ${exercise.question}\nBeklenen: ${JSON.stringify(exercise.answer_key || {})}\nKullanici cevabi: ${JSON.stringify(userAnswer)}`,
              },
            ],
            maxTokens: 300,
          })
          const clean = result.content.replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(clean)
          score = Number(parsed.score) || 0
          aiFeedback = String(parsed.feedback || '')
          isCorrect = score >= 60
        } catch {
          score = null
          aiFeedback = 'AI degerlendirmesi su an tamamlanamadi.'
          isCorrect = null
        }
      } else {
        const expected = JSON.stringify(exercise.answer_key ?? null)
        const got = JSON.stringify(userAnswer ?? null)
        isCorrect = expected === got
        score = isCorrect ? 100 : 0
      }

      const { data, error } = await sb
        .from('reader_exercise_attempts')
        .insert({
          exercise_id: exerciseId,
          user_id: user.id,
          user_answer: userAnswer,
          is_correct: isCorrect,
          score,
          ai_feedback: aiFeedback,
        })
        .select('*')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (action === 'generate') {
      const admin = await isAdmin(user.id)
      if (!admin) return NextResponse.json({ error: 'Sadece admin uretebilir' }, { status: 403 })

      const { book_id, section_key, source_text } = body
      if (!book_id || !section_key || !source_text) {
        return NextResponse.json({ error: 'book_id, section_key, source_text gerekli' }, { status: 400 })
      }

      const result = await callAI({
        messages: [
          {
            role: 'user',
            content: `Asagidaki metin icin 5 adet alistirma olustur. Sadece JSON array don.\nFormat: [{"exercise_type":"multiple_choice|true_false|fill_blank|open_ended","question":"...","options":["..."],"answer_key":{"correct":"..."},"difficulty":1}]\nMetin: ${String(source_text).slice(0, 6000)}`,
          },
        ],
        maxTokens: 1500,
      })

      const clean = result.content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      if (!Array.isArray(parsed)) return NextResponse.json({ error: 'AI formati gecersiz' }, { status: 500 })

      const payload = parsed.slice(0, 10).map((item: any) => ({
        book_id,
        section_key,
        exercise_type: item.exercise_type || 'multiple_choice',
        question: item.question || '',
        options: item.options || null,
        answer_key: item.answer_key || null,
        difficulty: Number(item.difficulty) || 1,
        source: 'ai',
        created_by: user.id,
      })).filter((x: any) => x.question)

      if (payload.length === 0) return NextResponse.json({ error: 'Uretilecek gecerli soru yok' }, { status: 400 })

      const { data, error } = await sb.from('reader_exercises').insert(payload).select('*')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Gecersiz action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
