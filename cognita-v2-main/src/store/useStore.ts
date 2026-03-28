import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VocabularyWord {
  id: string
  word: string
  meaning: string
  example?: string | null
  level?: 'temel' | 'orta' | 'ileri' | null
  is_learned?: boolean
}

interface BookCollection {
  id: string
  name: string
  description?: string | null
  cover_url?: string | null
  is_public?: boolean
  books?: string[]
}

type FontSize = 'sm' | 'md' | 'lg' | 'xl'
type LineHeight = 'compact' | 'normal' | 'relaxed'
type ReadingMode = 'light' | 'dark' | 'sepia'

interface AppState {
  user: { id: string; email: string; username?: string; avatar?: string | null } | null
  setUser: (u: AppState['user']) => void

  vocabulary: VocabularyWord[]
  addWord: (word: VocabularyWord) => void
  removeWord: (id: string) => void

  collections: BookCollection[]
  setCollections: (collections: BookCollection[]) => void
  addToCollection: (collectionId: string, bookId: string) => void

  readingTimer: { isRunning: boolean; startedAt: number | null; totalSeconds: number }
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void

  preferences: {
    fontSize: FontSize
    lineHeight: LineHeight
    readingMode: ReadingMode
    soundEnabled: boolean
    hapticEnabled: boolean
  }
  setPreference: <K extends keyof AppState['preferences']>(key: K, value: AppState['preferences'][K]) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),

      vocabulary: [],
      addWord: (word) => set((state) => ({ vocabulary: [word, ...state.vocabulary] })),
      removeWord: (id) => set((state) => ({ vocabulary: state.vocabulary.filter((w) => w.id !== id) })),

      collections: [],
      setCollections: (collections) => set({ collections }),
      addToCollection: (collectionId, bookId) => {
        set((state) => ({
          collections: state.collections.map((col) => {
            if (col.id !== collectionId) return col
            const books = new Set(col.books || [])
            books.add(bookId)
            return { ...col, books: Array.from(books) }
          }),
        }))
      },

      readingTimer: { isRunning: false, startedAt: null, totalSeconds: 0 },
      startTimer: () => {
        const timer = get().readingTimer
        if (timer.isRunning) return
        set({ readingTimer: { ...timer, isRunning: true, startedAt: Date.now() } })
      },
      stopTimer: () => {
        const timer = get().readingTimer
        if (!timer.isRunning || !timer.startedAt) return
        const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000)
        set({ readingTimer: { isRunning: false, startedAt: null, totalSeconds: timer.totalSeconds + elapsed } })
      },
      resetTimer: () => set({ readingTimer: { isRunning: false, startedAt: null, totalSeconds: 0 } }),

      preferences: {
        fontSize: 'md',
        lineHeight: 'normal',
        readingMode: 'light',
        soundEnabled: true,
        hapticEnabled: true,
      },
      setPreference: (key, value) => set((state) => ({
        preferences: { ...state.preferences, [key]: value },
      })),
    }),
    { name: 'cognita-store' }
  )
)
