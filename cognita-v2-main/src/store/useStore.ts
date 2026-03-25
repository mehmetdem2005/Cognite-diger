import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  user: { id: string; email: string; username?: string; avatar?: string | null } | null
  setUser: (u: AppState['user']) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'cognita-store' }
  )
)
