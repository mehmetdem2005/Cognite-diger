import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Türkçe ve popüler klasik kitaplar — Gutenberg ID'leri
const FEATURED_BOOKS = [
  // Türkçe kitaplar
  { id: 57562, title: 'Ömer Seyfettin Hikayeleri', author: 'Ömer Seyfettin', lang: 'tr', categories: ['Türk Edebiyatı', 'Hikaye'] },
  { id: 44808, title: 'Karamazov Kardeşler', author: 'Fyodor Dostoyevski', lang: 'tr', categories: ['Klasik', 'Roman'] },
  // İngilizce klasikler
  { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen', lang: 'en', categories: ['Classic', 'Romance'] },
  { id: 11, title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', lang: 'en', categories: ['Classic', 'Fantasy'] },
  { id: 84, title: 'Frankenstein', author: 'Mary Shelley', lang: 'en', categories: ['Classic', 'Horror'] },
  { id: 1080, title: 'A Modest Proposal', author: 'Jonathan Swift', lang: 'en', categories: ['Classic', 'Satire'] },
  { id: 2701, title: 'Moby Dick', author: 'Herman Melville', lang: 'en', categories: ['Classic', 'Adventure'] },
  { id: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens', lang: 'en', categories: ['Classic', 'Historical'] },
  { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', lang: 'en', categories: ['Classic', 'Mystery'] },
  { id: 74, title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', lang: 'en', categories: ['Classic', 'Adventure'] },
  { id: 16, title: 'Peter Pan', author: 'J. M. Barrie', lang: 'en', categories: ['Classic', 'Fantasy'] },
  { id: 345, title: 'Dracula', author: 'Bram Stoker', lang: 'en', categories: ['Classic', 'Horror'] },
  { id: 1260, title: 'Jane Eyre', author: 'Charlotte Bronte', lang: 'en', categories: ['Classic', 'Romance'] },
  { id: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', lang: 'en', categories: ['Classic', 'Philosophy'] },
  { id: 2554, title: 'Crime and Punishment', author: 'Fyodor Dostoyevsky', lang: 'en', categories: ['Classic', 'Philosophy'] },
  { id: 5200, title: 'Metamorphosis', author: 'Franz Kafka', lang: 'en', categories: ['Classic', 'Philosophy'] },
  { id: 2591, title: "Grimm's Fairy Tales", author: 'Brothers Grimm', lang: 'en', categories: ['Classic', 'Tales'] },
  { id: 4300, title: 'Ulysses', author: 'James Joyce', lang: 'en', categories: ['Classic', 'Novel'] },
  { id: 1400, title: 'Great Expectations', author: 'Charles Dickens', lang: 'en', categories: ['Classic', 'Novel'] },
  { id: 76, title: 'Adventures of Huckleberry Finn', author: 'Mark Twain', lang: 'en', categories: ['Classic', 'Adventure'] },
  { id: 25344, title: 'The Scarlet Letter', author: 'Nathaniel Hawthorne', lang: 'en', categories: ['Classic', 'Novel'] },
  { id: 2600, title: 'War and Peace', author: 'Leo Tolstoy', lang: 'en', categories: ['Classic', 'Historical'] },
  { id: 514, title: 'Little Women', author: 'Louisa May Alcott', lang: 'en', categories: ['Classic', 'Novel'] },
  { id: 1232, title: 'The Prince', author: 'Niccolo Machiavelli', lang: 'en', categories: ['Classic', 'Philosophy'] },
  { id: 2814, title: 'Dubliners', author: 'James Joyce', lang: 'en', categories: ['Classic', 'Short Stories'] },
  { id: 1184, title: 'The Count of Monte Cristo', author: 'Alexandre Dumas', lang: 'en', categories: ['Classic', 'Adventure'] },
  { id: 219, title: 'Heart of Darkness', author: 'Joseph Conrad', lang: 'en', categories: ['Classic', 'Novel'] },
  { id: 158, title: 'Emma', author: 'Jane Austen', lang: 'en', categories: ['Classic', 'Romance'] },
  { id: 768, title: 'Wuthering Heights', author: 'Emily Bronte', lang: 'en', categories: ['Classic', 'Romance'] },
  { id: 844, title: 'The Importance of Being Earnest', author: 'Oscar Wilde', lang: 'en', categories: ['Classic', 'Comedy'] },
]

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function fetchBookContent(gutenbergId: number): Promise<string | null> {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
    `https://gutenberg.pglaf.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Cognita/2.0 (educational platform)' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) continue
      let text = await res.text()
      if (!text || text.length < 500) continue

      // Gutenberg header/footer temizle
      const startMatch = text.search(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG[\s\S]*?\*\*\*/i)
      if (startMatch !== -1) {
        text = text.slice(startMatch)
        text = text.replace(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG[\s\S]*?\*\*\*/i, '')
        const firstParagraph = text.indexOf('\n\n')
        if (firstParagraph !== -1) text = text.slice(firstParagraph)
      }
      const endMatch = text.search(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG/i)
      if (endMatch !== -1) text = text.slice(0, endMatch)

      // 500KB ile sınırla
      if (text.length > 500_000) text = text.slice(0, 500_000)

      return text.trim()
    } catch {
      continue
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { limit = 10 } = await req.json()
    const sb = getServiceSupabase()

    // Mevcut kitapları kontrol et (duplicate önle)
    const { data: existing } = await sb.from('catalog_books').select('title')
    const existingTitles = new Set((existing || []).map((b: any) => b.title.toLowerCase()))

    const results = { success: 0, failed: 0, skipped: 0, books: [] as string[] }
    const booksToProcess = FEATURED_BOOKS.slice(0, limit)

    for (const book of booksToProcess) {
      // Zaten varsa atla
      if (existingTitles.has(book.title.toLowerCase())) {
        results.skipped++
        continue
      }

      try {
        // İçeriği çek
        const content = await fetchBookContent(book.id)

        // Catalog'a ekle
        const { error } = await sb.from('catalog_books').insert({
          title: book.title,
          author: book.author,
          language: book.lang,
          is_published: true,
          categories: book.categories,
          content: content || null,
          cover_url: `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`,
          description: `${book.author} tarafından yazılmış klasik eser.`,
          tags: book.categories,
        })

        if (error) {
          results.failed++
        } else {
          results.success++
          results.books.push(book.title)
        }

        // Rate limit için kısa bekleme
        await new Promise(r => setTimeout(r, 500))
      } catch {
        results.failed++
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Mevcut listeyi getir
export async function GET() {
  return NextResponse.json({ books: FEATURED_BOOKS })
}
