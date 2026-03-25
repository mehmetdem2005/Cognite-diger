import { supabase } from './supabase'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const cognitaAPI = {
  async extractPDF(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/pdf/extract', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('PDF işlenemedi')
    return res.json()
  },

  async generateFlashcards(text: string, bookTitle: string) {
    const authHeader = await getAuthHeader()
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ text, bookTitle }),
    })
    if (!res.ok) throw new Error('Flashcard üretilemedi')
    return res.json()
  },

  async analyzeBook(text: string, bookTitle: string) {
    const authHeader = await getAuthHeader()
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ text, book_title: bookTitle }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.detail || body?.error || 'Analiz yapılamadı')
    }
    return res.json()
  },

  async chatWithBook(message: string, bookContent: string, bookTitle: string, groqModel?: 'fast' | 'quality') {
    const authHeader = await getAuthHeader()
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ message, book_content: bookContent, book_title: bookTitle, groq_model: groqModel ?? 'fast' }),
    })
    if (!res.ok) throw new Error('Yanıt alınamadı')
    return res.json()
  },

  async writingAssistant(text: string, groqModel?: 'fast' | 'quality') {
    const authHeader = await getAuthHeader()
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ message: text, book_content: '', book_title: 'Yazma Asistanı', groq_model: groqModel ?? 'fast' }),
    })
    if (!res.ok) throw new Error('Asistan yanıt veremedi')
    return res.json()
  },
}
