'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { getAdminByUserId, getAllAdmins,

canManageCatalog, canManageAdmins, type Admin, type AdminRole } from '@/lib/adminAuth'
import GutenbergBulkImport from '@/components/ui/GutenbergBulkImport'
import { BOOK_CATEGORIES } from '@/lib/categories'
import { ArrowLeft, Plus, X, Edit2, Trash2, BookOpen, Users, MessageSquare, Send, Upload, Image, Check, Download, Search as SearchIcon, Cpu, ToggleLeft, ToggleRight, RefreshCw, ExternalLink, ChevronUp, ChevronDown, LayoutDashboard, Shield, PenSquare, Headphones, BellRing } from 'lucide-react'

interface ProviderConfig {
  id: string
  provider_name: string
  display_name: string
  is_enabled: boolean
  provider_category: 'paid' | 'free' | 'free_limited'
  daily_limit: number | null
  requests_used_today: number
  last_reset_date: string
  tokens_remaining: number | null
  tokens_used_today: number
  token_daily_limit: number | null
  total_tokens_used: number
  fallback_threshold: number
  fallback_to: string | null
  priority: number
  model_name: string
  total_requests_made: number
}

interface GutenbergBook {
  id: number
  title: string
  authors: { name: string }[]
  subjects: string[]
  formats: Record<string, string>
  download_count: number
}

const GRADIENTS = [
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
  'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)',
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
]

const SkeletonRow = () => (
  <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
    <div style={{ width: '44px', height: '60px', borderRadius: '8px', background: 'var(--bg-soft)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: '14px', borderRadius: '6px', background: 'var(--bg-soft)', marginBottom: '0.4rem', width: '70%' }} />
      <div style={{ height: '11px', borderRadius: '6px', background: 'var(--bg-soft)', width: '45%' }} />
    </div>
  </div>
)
const NoResults = ({ q }: { q: string }) => (
  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
    <BookOpen size={32} color="var(--border)" style={{ marginBottom: '0.75rem' }} />
    <p>"{q}" için sonuç bulunamadı.</p>
  </div>
)
const CoverThumb = ({ src, i }: { src?: string; i: number }) => (
  <div style={{ width: '44px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: GRADIENTS[i % GRADIENTS.length] }}>
    {src ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={16} color="white" /></div>}
  </div>
)

interface CatalogBook {
  id: string; title: string; author: string | null; cover_url: string | null
  description: string | null; categories: string[]; language: string; level: string | null
  is_published: boolean; total_pages: number; created_at: string
}

interface AdminMessage {
  id: string; content: string; is_broadcast: boolean; is_read: boolean; created_at: string
  from_admin_id: string
  to_admin_id: string | null
  from_admin?: { profiles?: { full_name: string | null; username: string | null } }
}

interface DashboardCounters {
  total_users: number
  new_users_today: number
  active_users_24h: number
  public_books: number
  catalog_books: number
  reading_sessions_today: number
  public_highlights: number
  total_admins: number
}

export default function AdminPanel() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<'dashboard' | 'catalog' | 'admins' | 'messages' | 'ai-providers' | 'product'>('dashboard')

  // App settings state (super_admin only)
  interface AppSetting { key: string; value: string; description: string | null; updated_at: string }
  const [appSettings, setAppSettings] = useState<AppSetting[]>([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsFetchError, setSettingsFetchError] = useState<string | null>(null)
  const [seedingDefaults, setSeedingDefaults] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardCounters | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Catalog state
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [showAddBook, setShowAddBook] = useState(false)
  const [editingBook, setEditingBook] = useState<CatalogBook | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookDesc, setBookDesc] = useState('')
  const [bookContent, setBookContent] = useState('')
  const [bookLanguage, setBookLanguage] = useState('tr')
  const [bookLevel, setBookLevel] = useState('')
  const [bookCategories, setBookCategories] = useState<string[]>([])
  const [bookPublished, setBookPublished] = useState(true)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [autoClassifying, setAutoClassifying] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  // Admins state
  const [admins, setAdmins] = useState<Admin[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('moderator')
  const [addingAdmin, setAddingAdmin] = useState(false)

  // Book import state
  const [showGutenberg, setShowGutenberg] = useState(false)
  const [gutenbergQuery, setGutenbergQuery] = useState('')
  const [gutenbergResults, setGutenbergResults] = useState<GutenbergBook[]>([])
  const [gutenbergLoading, setGutenbergLoading] = useState(false)
  const [importingKey, setImportingKey] = useState<string | null>(null)
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set())
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const gutenbergDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const gutenbergInputRef = useRef<HTMLInputElement>(null)

  // Messages state
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [msgContent, setMsgContent] = useState('')
  const [msgTarget, setMsgTarget] = useState<string>('broadcast')
  const [sendingMsg, setSendingMsg] = useState(false)

  // AI Providers state (super_admin only)
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([])
  const [providerSubTab, setProviderSubTab] = useState<'paid' | 'free' | 'settings'>('free')
  const [providerLoading, setProviderLoading] = useState(false)
  const [togglingProvider, setTogglingProvider] = useState<string | null>(null)
  const [providerActionMsg, setProviderActionMsg] = useState<string | null>(null)
  const [syncingBalance, setSyncingBalance] = useState<string | null>(null)
  const [deepseekBalance, setDeepseekBalance] = useState<{ total_balance: string; currency: string; is_available: boolean } | null>(null)

  const ADVANCED_SETTINGS = [
    { key: 'policy_terms_version', label: 'Kullanım Şartları Sürümü', type: 'text', group: 'policies' },
    { key: 'policy_privacy_summary', label: 'Gizlilik Özeti', type: 'textarea', group: 'policies' },
    { key: 'user_announcement_active', label: 'Kullanıcı Duyurusu Aktif (1/0)', type: 'number', group: 'announcements' },
    { key: 'user_announcement_banner', label: 'Duyuru Metni', type: 'textarea', group: 'announcements' },
    { key: 'writer_ai_assist_enabled', label: 'Yazarlıkta AI Asistan (1/0)', type: 'number', group: 'writer' },
    { key: 'writer_auto_save_interval_sec', label: 'Yazarlık Otomatik Kaydetme (sn)', type: 'number', group: 'writer' },
    { key: 'reader_long_press_panel_enabled', label: 'Reader Basılı Tut Paneli (1/0)', type: 'number', group: 'reader' },
    { key: 'reader_translation_enabled', label: 'Reader Çeviri (1/0)', type: 'number', group: 'reader' },
    { key: 'reader_tts_enabled', label: 'Reader Seslendirme (1/0)', type: 'number', group: 'reader' },
    { key: 'reader_word_examples_enabled', label: 'Reader Örnek Cümle (1/0)', type: 'number', group: 'reader' },
  ] as const

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/auth/login'); return }
      checkAdmin()
    }
  }, [user, loading])

  const checkAdmin = async () => {
    const a = await getAdminByUserId(user!.id)
    setAdmin(a)
    setChecking(false)
    if (a) {
      fetchDashboard()
      fetchBooks()
      fetchAdmins()
      fetchMessages()
      if (a.role === 'super_admin') { fetchProviderConfigs(); fetchAppSettings() }
    }
  }

  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!json.error) setDashboard(json.data?.counters || null)
    } catch {}
    setDashboardLoading(false)
  }

  const fetchBooks = async () => {
    const res = await fetch('/api/catalog')
    const json = await res.json()
    setBooks(json.data || [])
  }

  const fetchAdmins = async () => {
    const list = await getAllAdmins()
    setAdmins(list)
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('admin_messages')
      .select('*, from_admin:from_admin_id(profiles(full_name, username))')
      .order('created_at', { ascending: false })
      .limit(50)
    setMessages(data || [])
  }

  const fetchProviderConfigs = async () => {
    setProviderLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/ai/provider-config', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.error) {
        setProviderActionMsg(`Hata: ${json.error}`)
      } else {
        setProviderConfigs(json.data || [])
      }
    } catch (e: any) {
      setProviderActionMsg(`Hata: ${e.message}`)
    }
    setProviderLoading(false)
  }

  const fetchAppSettings = async () => {
    setSettingsLoading(true)
    setSettingsFetchError(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.error) {
        setSettingsFetchError(json.error)
      } else {
        setAppSettings(json.data || [])
        const draft: Record<string, string> = {}
        ;(json.data || []).forEach((s: { key: string; value: string }) => { draft[s.key] = s.value })
        setSettingsDraft(draft)
      }
    } catch (e: any) {
      setSettingsFetchError(e.message || 'Bilinmeyen hata')
    }
    setSettingsLoading(false)
  }

  const DEFAULT_SETTINGS = [
    { key: 'daily_ai_requests_per_user', value: '10', description: 'Kullanıcı başına günlük AI kitap analizi limiti' },
    { key: 'max_books_per_user', value: '50', description: 'Kullanıcı başına maksimum kitap sayısı' },
  ]

  const handleSeedDefaults = async () => {
    setSeedingDefaults(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      for (const s of DEFAULT_SETTINGS) {
        await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ key: s.key, value: s.value, description: s.description }),
        })
      }
      await fetchAppSettings()
      setSettingsMsg('Varsayılan ayarlar yüklendi ✓')
      setTimeout(() => setSettingsMsg(null), 2000)
    } catch (e: any) {
      setSettingsMsg(`Hata: ${e.message}`)
    }
    setSeedingDefaults(false)
  }

  const handleSaveSetting = async (key: string) => {
    setSavingKey(key)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, value: settingsDraft[key] }),
      })
      const json = await res.json()
      if (json.error) {
        setSettingsMsg(`Hata: ${json.error}`)
      } else {
        setAppSettings(prev => prev.map(s => s.key === key ? { ...s, value: settingsDraft[key] } : s))
        setSettingsMsg('Kaydedildi ✓')
        setTimeout(() => setSettingsMsg(null), 2000)
      }
    } catch (e: any) {
      setSettingsMsg(`Hata: ${e.message}`)
    }
    setSavingKey(null)
  }

  const handleSeedAdvancedDefaults = async () => {
    setSeedingDefaults(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const defaults = [
        { key: 'policy_terms_version', value: 'v1.0', description: 'Kullanım şartları sürümü' },
        { key: 'policy_privacy_summary', value: 'Verileriniz yalnızca ürün deneyimini iyileştirmek için kullanılır.', description: 'Kullanıcıya gösterilen kısa gizlilik özeti' },
        { key: 'user_announcement_active', value: '0', description: 'Duyuru banner aktif mi? 1/0' },
        { key: 'user_announcement_banner', value: '', description: 'Üst banner kullanıcı duyuru metni' },
        { key: 'writer_ai_assist_enabled', value: '1', description: 'Yazarlık ekranında AI yardımcı özellikleri' },
        { key: 'writer_auto_save_interval_sec', value: '20', description: 'Yazarlık otomatik kaydetme süresi' },
        { key: 'reader_long_press_panel_enabled', value: '1', description: 'Reader uzun bas paneli aktif' },
        { key: 'reader_translation_enabled', value: '1', description: 'Reader çeviri özelliği aktif' },
        { key: 'reader_tts_enabled', value: '1', description: 'Reader seslendirme özelliği aktif' },
        { key: 'reader_word_examples_enabled', value: '1', description: 'Kelime panelinde örnek cümle gösterimi' },
      ]

      await Promise.all(defaults.map((s) => fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(s),
      })))

      await fetchAppSettings()
      setSettingsMsg('Gelişmiş ürün ayarları yüklendi ✓')
      setTimeout(() => setSettingsMsg(null), 2500)
    } catch (e: any) {
      setSettingsMsg(`Hata: ${e.message}`)
    }
    setSeedingDefaults(false)
  }

  const handleReorderProvider = async (providerName: string, direction: 'up' | 'down') => {
    const sorted = [...providerConfigs].sort((a, b) => a.priority - b.priority)
    const idx = sorted.findIndex(p => p.provider_name === providerName)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx]
    const b = sorted[swapIdx]
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      await Promise.all([
        fetch('/api/ai/provider-config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ provider_name: a.provider_name, priority: b.priority }),
        }),
        fetch('/api/ai/provider-config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ provider_name: b.provider_name, priority: a.priority }),
        }),
      ])
      await fetchProviderConfigs()
    } catch {}
  }

  const handleToggleProvider = async (providerName: string, currentEnabled: boolean) => {
    setTogglingProvider(providerName)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      await fetch('/api/ai/provider-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider_name: providerName, is_enabled: !currentEnabled }),
      })
      await fetchProviderConfigs()
      setProviderActionMsg(`${currentEnabled ? 'Kapatıldı' : 'Açıldı'}`)
      setTimeout(() => setProviderActionMsg(null), 2000)
    } catch {}
    setTogglingProvider(null)
  }

  const handleResetDailyCounter = async (providerName: string) => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      await fetch('/api/ai/provider-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider_name: providerName }),
      })
      await fetchProviderConfigs()
      setProviderActionMsg('Günlük sayaç sıfırlandı')
      setTimeout(() => setProviderActionMsg(null), 2000)
    } catch {}
  }

  const handleSyncBalance = async (providerName: string) => {
    setSyncingBalance(providerName)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch(`/api/ai/sync-balance?provider=${providerName}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (providerName === 'deepseek' && data.total_balance !== undefined) {
        setDeepseekBalance({ total_balance: data.total_balance, currency: data.currency, is_available: data.is_available })
        setProviderActionMsg(`DeepSeek bakiye: ${data.total_balance} ${data.currency}`)
        setTimeout(() => setProviderActionMsg(null), 4000)
      } else if (data.billing_url) {
        window.open(data.billing_url, '_blank')
      } else if (data.error) {
        setProviderActionMsg(`Hata: ${data.error}`)
        setTimeout(() => setProviderActionMsg(null), 3000)
      }
    } catch {
      setProviderActionMsg('Senkronizasyon başarısız')
      setTimeout(() => setProviderActionMsg(null), 2000)
    } finally {
      setSyncingBalance(null)
    }
  }

  const resetBookForm = () => {
    setBookTitle(''); setBookAuthor(''); setBookDesc(''); setBookContent('')
    setBookLanguage('tr'); setBookLevel(''); setBookCategories([])
    setBookPublished(true); setCoverFile(null); setCoverPreview(null); setPdfFile(null)
    setGeneratedCoverUrl(null); setPdfProgress(0)
    setEditingBook(null)
  }

  const handleCoverSelect = (file: File) => {
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file)
    setPdfParsing(true)
    setPdfProgress(0)
    try {
      const { extractTextFromPDF } = await import('@/lib/pdfParser')
      const text = await extractTextFromPDF(file, (pct) => setPdfProgress(pct))
      setBookContent(text)
      const title = bookTitle || file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
      if (!bookTitle) setBookTitle(title)
      // Auto-generate cover if none selected
      if (!coverFile && !coverPreview) {
        handleGenerateCover(title, bookAuthor, bookDesc)
      }
    } catch { alert('PDF okunamadı.') }
    setPdfParsing(false)
    setPdfProgress(0)
  }

  const handleGenerateCover = async (title: string, author: string, description: string) => {
    if (!title.trim()) return
    setGeneratingCover(true)
    try {
      const res = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, description }),
      })
      const data = await res.json()
      if (data.url) {
        setCoverPreview(data.url)
        // Store as a flag so handleSaveBook uses this URL directly
        setCoverFile(null)
        setGeneratedCoverUrl(data.url)
      }
    } catch {}
    setGeneratingCover(false)
  }

  const handleAutoClassify = async (title: string, author: string, description: string, content: string) => {
    if (!title.trim()) return
    setAutoClassifying(true)
    try {
      const res = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, description, content }),
      })
      const data = await res.json()
      if (!data.error) {
        if (data.categories?.length) setBookCategories(data.categories)
        if (data.language) setBookLanguage(data.language)
        if (data.level) setBookLevel(data.level)
      }
    } catch {}
    setAutoClassifying(false)
  }

  const handleSaveBook = async () => {
    if (!bookTitle.trim() || !admin) return
    setSaving(true)

    let coverUrl: string | null = editingBook?.cover_url || null
    if (coverFile) {
      try {
        const ext = coverFile.name.split('.').pop()
        const path = `catalog/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('covers').upload(path, coverFile, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
          coverUrl = publicUrl
        }
      } catch {}
    } else if (generatedCoverUrl) {
      coverUrl = generatedCoverUrl
    }

    const words = bookContent.trim().split(/\s+/).filter(Boolean).length
    const pages = Math.max(1, Math.ceil(words / 300))

    const payload = {
      title: bookTitle.trim(),
      author: bookAuthor.trim() || null,
      cover_url: coverUrl,
      description: bookDesc.trim() || null,
      content: bookContent.trim() || null,
      language: bookLanguage,
      level: bookLevel || null,
      categories: bookCategories,
      is_published: bookPublished,
      total_pages: pages,
      added_by: admin.id,
    }

    if (editingBook) {
      await supabase.from('catalog_books').update(payload).eq('id', editingBook.id)
    } else {
      await supabase.from('catalog_books').insert(payload)
    }

    resetBookForm()
    setShowAddBook(false)
    setSaving(false)
    fetchBooks()
  }

  const handleEditBook = (book: CatalogBook) => {
    setEditingBook(book)
    setBookTitle(book.title)
    setBookAuthor(book.author || '')
    setBookDesc(book.description || '')
    setBookLanguage(book.language)
    setBookLevel(book.level || '')
    setBookCategories(book.categories || [])
    setBookPublished(book.is_published)
    setCoverPreview(book.cover_url)
    setShowAddBook(true)
  }

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Kitabı katalogdan sil?')) return
    await supabase.from('catalog_books').delete().eq('id', id)
    fetchBooks()
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !admin) return
    setAddingAdmin(true)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', newAdminEmail.trim())
      .single()
    if (!profile) { alert('Bu email ile kayıtlı kullanıcı bulunamadı.'); setAddingAdmin(false); return }
    const { error } = await supabase.from('admins').insert({
      user_id: profile.id,
      role: newAdminRole,
      invited_by: admin.id,
    })
    if (error) alert('Admin eklenemedi: ' + error.message)
    else { setNewAdminEmail(''); fetchAdmins() }
    setAddingAdmin(false)
  }

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Bu admini kaldır?')) return
    await supabase.from('admins').delete().eq('id', adminId)
    fetchAdmins()
  }

  const handleSendMessage = async () => {
    if (!msgContent.trim() || !admin) return
    setSendingMsg(true)
    const payload: any = {
      from_admin_id: admin.id,
      content: msgContent.trim(),
      is_broadcast: msgTarget === 'broadcast',
      to_admin_id: msgTarget !== 'broadcast' ? msgTarget : null,
    }
    await supabase.from('admin_messages').insert(payload)
    setMsgContent('')
    setSendingMsg(false)
    fetchMessages()
  }

  const handleMarkRead = async (msgId: string) => {
    await supabase.from('admin_messages').update({ is_read: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m))
  }

  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from('admin_messages').delete().eq('id', msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  const gradient = (i: number) => GRADIENTS[i % GRADIENTS.length]

  const handleSearchInput = (val: string) => {
    setGutenbergQuery(val)
    if (gutenbergDebounceRef.current) clearTimeout(gutenbergDebounceRef.current)
    if (!val.trim()) { setGutenbergResults([]); setGutenbergLoading(false); return }
    setGutenbergLoading(true)
    gutenbergDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(val)}&languages=en,tr`)
        const data = await res.json()
        setGutenbergResults(data.results || [])
      } catch {}
      setGutenbergLoading(false)
    }, 200)
  }

  const importGutenbergBook = async (book: GutenbergBook) => {
    if (!admin) return
    const key = String(book.id)
    setImportingKey(key)
    const author = book.authors[0]?.name?.replace(/,\s*/, ' ').split(' ').reverse().join(' ') || null
    const subjects = book.subjects.slice(0, 3).join(', ')
    let content: string | null = null
    try {
      const res = await fetch('/api/gutenberg-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formats: book.formats, bookId: book.id }) })
      const data = await res.json()
      content = data.content || null
    } catch {}
    const words = content ? content.trim().split(/\s+/).filter(Boolean).length : 0
    const pages = words > 0 ? Math.max(1, Math.ceil(words / 300)) : 0
    let aiLanguage = 'en'; let aiLevel: string | null = null; let aiCategories: string[] = []
    try {
      const cr = await fetch('/api/ai/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: book.title, author, description: subjects, content }) })
      const cd = await cr.json()
      if (!cd.error) { aiLanguage = cd.language || 'en'; aiLevel = cd.level || null; aiCategories = cd.categories || [] }
    } catch {}
    const session = await supabase.auth.getSession()
const token = session.data.session?.access_token
    
    const res = await fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: book.title, author, cover_url: book.formats['image/jpeg'] || null, description: subjects || null, content, language: aiLanguage, level: aiLevel, categories: aiCategories, is_published: true, total_pages: pages, added_by: admin.id }) })
    const json = await res.json()
    if (json.error) { setImportError(json.error); setImportingKey(null); setTimeout(() => setImportError(null), 4000); return }
    setImportedKeys(prev => new Set(prev).add(key))
    setImportingKey(null)
    setImportSuccess(key)
    setTimeout(() => setImportSuccess(null), 2000)
    fetchBooks()
  }

  if (loading || checking) return <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p></main>

  if (!admin) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <BookOpen size={48} color="var(--text-muted)" />
      <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Erişim Yok</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Bu sayfaya erişim için admin yetkisi gerekiyor.</p>
      <button onClick={() => router.push('/home')} className="btn-primary" style={{ padding: '0.7rem 1.5rem', borderRadius: '12px' }}>Ana Sayfaya Dön</button>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '2rem' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: '54px', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--text)" />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', flex: 1 }}>Admin Panel</h1>
        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: admin.role === 'super_admin' ? 'rgba(64,93,230,0.15)' : 'rgba(67,233,123,0.15)', color: admin.role === 'super_admin' ? 'var(--accent)' : '#16a34a', fontWeight: 700 }}>
          {admin.role === 'super_admin' ? 'Süper Admin' : admin.role === 'admin' ? 'Admin' : 'Moderatör'}
        </span>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', overflowX: 'auto' }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
          { id: 'catalog', label: 'Katalog', icon: <BookOpen size={15} /> },
          { id: 'admins', label: 'Adminler', icon: <Users size={15} /> },
          { id: 'messages', label: 'Mesajlar', icon: <MessageSquare size={15} /> },
          ...(admin.role === 'super_admin' ? [{ id: 'product', label: 'Ürün', icon: <Shield size={15} /> }] : []),
          ...(admin.role === 'super_admin' ? [{ id: 'ai-providers', label: 'AI', icon: <Cpu size={15} /> }] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, minWidth: '70px', padding: '0.85rem 0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1rem' }}>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
              {[
                { label: 'Toplam Üye', value: dashboard?.total_users ?? '-', icon: <Users size={14} color="var(--accent)" /> },
                { label: 'Bugün Yeni', value: dashboard?.new_users_today ?? '-', icon: <BellRing size={14} color="#16a34a" /> },
                { label: 'Aktif 24s', value: dashboard?.active_users_24h ?? '-', icon: <LayoutDashboard size={14} color="#f59e0b" /> },
                { label: 'Günlük Seans', value: dashboard?.reading_sessions_today ?? '-', icon: <BookOpen size={14} color="#7c3aed" /> },
                { label: 'Public Kitap', value: dashboard?.public_books ?? '-', icon: <BookOpen size={14} color="var(--accent)" /> },
                { label: 'Public Highlight', value: dashboard?.public_highlights ?? '-', icon: <MessageSquare size={14} color="#db2777" /> },
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>{item.icon}<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.label}</span></div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{dashboardLoading ? '...' : item.value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1rem', marginBottom: '0.8rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 700, marginBottom: '0.65rem' }}>Yöneticilik Kapasitesi</p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rol: <strong style={{ color: 'var(--text)' }}>{admin.role}</strong></div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Katalog yönetimi: <strong style={{ color: canManageCatalog(admin.role) ? '#16a34a' : '#dc2626' }}>{canManageCatalog(admin.role) ? 'Açık' : 'Kapalı'}</strong></div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Admin yönetimi: <strong style={{ color: canManageAdmins(admin.role) ? '#16a34a' : '#dc2626' }}>{canManageAdmins(admin.role) ? 'Açık' : 'Kapalı'}</strong></div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>AI sağlayıcıları: <strong style={{ color: admin.role === 'super_admin' ? '#16a34a' : '#dc2626' }}>{admin.role === 'super_admin' ? 'Açık' : 'Kapalı'}</strong></div>
              </div>
            </div>

            <button onClick={fetchDashboard} style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-soft)', padding: '0.7rem', cursor: 'pointer', color: 'var(--text)', fontWeight: 700 }}>
              Dashboard Yenile
            </button>
          </div>
        )}

        {/* KATALOG TAB */}
        {tab === 'catalog' && (
          <div>
            {canManageCatalog(admin.role) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => { resetBookForm(); setShowAddBook(true) }} className="btn-primary" style={{ flex: 1, padding: '0.85rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Plus size={18} /> Manuel Ekle
                </button>
                <button onClick={() => setShowGutenberg(true)} style={{ flex: 1, padding: '0.85rem', borderRadius: '14px', background: 'var(--bg-soft)', border: '1.5px solid var(--border)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <Download size={18} /> Gutenberg'den Al
                </button>
              </div>
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{books.length} kitap</p>
            {books.map((book, i) => (
              <div key={book.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '14px', marginBottom: '0.6rem', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '60px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  {book.cover_url ? (
                    <img src={book.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: gradient(i), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={18} color="white" />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</p>
                  {book.author && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{book.author}</p>}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: book.is_published ? 'rgba(67,233,123,0.15)' : 'rgba(255,100,100,0.1)', color: book.is_published ? '#16a34a' : '#dc2626' }}>{book.is_published ? 'Yayında' : 'Taslak'}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{book.language.toUpperCase()}</span>
                    {book.level && <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(64,93,230,0.1)', color: 'var(--accent)' }}>{book.level}</span>}
                  </div>
                </div>
                {canManageCatalog(admin.role) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <button onClick={() => handleEditBook(book)} style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}>
                      <Edit2 size={14} color="var(--accent)" />
                    </button>
                    <button onClick={() => handleDeleteBook(book.id)} style={{ background: 'var(--bg-soft)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PRODUCT TAB — super_admin */}
        {tab === 'product' && admin.role === 'super_admin' && (
          <div>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <button onClick={handleSeedAdvancedDefaults} disabled={seedingDefaults} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: seedingDefaults ? 0.6 : 1 }}>
                {seedingDefaults ? 'Yükleniyor...' : 'Gelişmiş Varsayılanları Kur'}
              </button>
              <button onClick={fetchAppSettings} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-soft)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
                Ayarları Yenile
              </button>
            </div>

            {[
              { id: 'policies', title: 'Politikalar', icon: <Shield size={14} color="var(--accent)" /> },
              { id: 'announcements', title: 'Kullanıcı Bilgilendirmeleri', icon: <BellRing size={14} color="#16a34a" /> },
              { id: 'writer', title: 'Yazarlık Bölümü', icon: <PenSquare size={14} color="#7c3aed" /> },
              { id: 'reader', title: 'Okuma Bölümü', icon: <Headphones size={14} color="#db2777" /> },
            ].map(group => {
              const groupSettings = ADVANCED_SETTINGS.filter(setting => setting.group === group.id)
              return (
                <div key={group.id} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>{group.icon}<h3 style={{ fontSize: '0.86rem', color: 'var(--text)', fontWeight: 800 }}>{group.title}</h3></div>
                  {groupSettings.map(setting => {
                    const value = settingsDraft[setting.key] ?? appSettings.find(s => s.key === setting.key)?.value ?? ''
                    return (
                      <div key={setting.key} style={{ marginBottom: '0.7rem' }}>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{setting.label}</p>
                        {setting.type === 'textarea' ? (
                          <textarea
                            className="input"
                            value={value}
                            rows={2}
                            onChange={e => setSettingsDraft(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            style={{ resize: 'vertical', marginBottom: '0.35rem' }}
                          />
                        ) : (
                          <input
                            className="input"
                            type={setting.type}
                            value={value}
                            onChange={e => setSettingsDraft(prev => ({ ...prev, [setting.key]: e.target.value }))}
                            style={{ marginBottom: '0.35rem' }}
                          />
                        )}
                        <button onClick={() => handleSaveSetting(setting.key)} disabled={savingKey === setting.key} style={{ padding: '0.4rem 0.85rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', opacity: savingKey === setting.key ? 0.5 : 1 }}>
                          {savingKey === setting.key ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* ADMİNLER TAB */}
        {tab === 'admins' && (
          <div>
            {canManageAdmins(admin.role) && (
              <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.75rem' }}>Yeni Admin Ekle</p>
                <input className="input" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email adresi" style={{ marginBottom: '0.5rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {(['admin', 'moderator'] as AdminRole[]).map(r => (
                    <button key={r} onClick={() => setNewAdminRole(r)} style={{ flex: 1, padding: '0.55rem', borderRadius: '10px', border: `2px solid ${newAdminRole === r ? 'var(--accent)' : 'var(--border)'}`, background: newAdminRole === r ? 'rgba(64,93,230,0.1)' : 'transparent', color: newAdminRole === r ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                      {r === 'admin' ? 'Admin' : 'Moderatör'}
                    </button>
                  ))}
                </div>
                <button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminEmail.trim()} className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', opacity: addingAdmin || !newAdminEmail.trim() ? 0.5 : 1 }}>
                  {addingAdmin ? 'Ekleniyor...' : 'Admin Ekle'}
                </button>
              </div>
            )}
            {admins.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '14px', marginBottom: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {(a.profiles as any)?.avatar_url ? (
                    <img src={(a.profiles as any).avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {((a.profiles as any)?.full_name || (a.profiles as any)?.username || 'A')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{(a.profiles as any)?.full_name || (a.profiles as any)?.username || 'İsimsiz'}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(a.profiles as any)?.email}</p>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '999px', background: a.role === 'super_admin' ? 'rgba(64,93,230,0.15)' : a.role === 'admin' ? 'rgba(67,233,123,0.15)' : 'rgba(255,180,0,0.15)', color: a.role === 'super_admin' ? 'var(--accent)' : a.role === 'admin' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                  {a.role === 'super_admin' ? 'Süper' : a.role === 'admin' ? 'Admin' : 'Mod'}
                </span>
                {canManageAdmins(admin.role) && a.user_id !== user!.id && (
                  <button onClick={() => handleRemoveAdmin(a.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem' }}>
                    <X size={16} color="#dc2626" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MESAJLAR TAB */}
        {tab === 'messages' && (
          <div>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.75rem' }}>Mesaj Gönder</p>
              <select value={msgTarget} onChange={e => setMsgTarget(e.target.value)} className="input" style={{ marginBottom: '0.5rem' }}>
                <option value="broadcast">Tüm Adminler (Duyuru)</option>
                {admins.filter(a => a.user_id !== user!.id).map(a => (
                  <option key={a.id} value={a.id}>{(a.profiles as any)?.full_name || (a.profiles as any)?.username || 'Admin'}</option>
                ))}
              </select>
              <textarea className="input" value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder="Mesajınızı yazın..." rows={3} style={{ resize: 'none', marginBottom: '0.5rem' }} />
              <button onClick={handleSendMessage} disabled={sendingMsg || !msgContent.trim()} className="btn-primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', opacity: sendingMsg || !msgContent.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Send size={15} /> Gönder
              </button>
            </div>
            {messages.map(msg => {
              const senderName = msg.from_admin?.profiles?.full_name || msg.from_admin?.profiles?.username || 'Admin'
              const isMyMsg = msg.from_admin_id === admin?.id
              const canMarkRead = !msg.is_read && (msg.to_admin_id === admin?.id || msg.is_broadcast) && !isMyMsg
              return (
                <div key={msg.id} style={{ padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '14px', marginBottom: '0.6rem', borderLeft: `3px solid ${msg.is_broadcast ? 'var(--accent)' : msg.is_read ? 'var(--border)' : '#f59e0b'}`, opacity: msg.is_read ? 0.75 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {senderName}{msg.is_broadcast ? ' → Herkese' : ''}
                      {msg.is_read && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>✓ okundu</span>}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleString('tr-TR')}</span>
                      {canMarkRead && (
                        <button onClick={() => handleMarkRead(msg.id)} title="Okundu işaretle" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.1rem', color: '#10b981' }}>
                          <Check size={14} />
                        </button>
                      )}
                      {(isMyMsg || admin?.role === 'super_admin') && (
                        <button onClick={() => handleDeleteMessage(msg.id)} title="Sil" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.1rem', color: '#dc2626' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{msg.content}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* AI PROVIDERS TAB — sadece super_admin */}
        {tab === 'ai-providers' && admin.role === 'super_admin' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hangi AI sağlayıcıların kullanılacağını yönet</p>
              <button onClick={fetchProviderConfigs} disabled={providerLoading} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={13} style={{ animation: providerLoading ? 'spin 1s linear infinite' : 'none' }} /> Yenile
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {([
                { id: 'free', label: 'Ücretsiz' },
                { id: 'paid', label: 'Ücretli' },
                { id: 'settings', label: 'Kullanıcı Limitleri' },
              ] as const).map(st => (
                <button key={st.id} onClick={() => setProviderSubTab(st.id)} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: `2px solid ${providerSubTab === st.id ? 'var(--accent)' : 'var(--border)'}`, background: providerSubTab === st.id ? 'rgba(64,93,230,0.08)' : 'transparent', color: providerSubTab === st.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: providerSubTab === st.id ? 700 : 400, cursor: 'pointer' }}>
                  {st.label}
                </button>
              ))}
            </div>

            {providerLoading && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>}

            {/* ÜCRETSIZ SÜRÜMLER */}
            {providerSubTab === 'free' && !providerLoading && (
              <div>
                {providerConfigs
                  .filter(p => p.provider_category === 'free' || p.provider_category === 'free_limited')
                  .map(p => {
                    const isFreeLimited = p.provider_category === 'free_limited'
                    const dailyLimit = p.daily_limit ?? 1500
                    const used = p.requests_used_today
                    const reqRemaining = isFreeLimited ? dailyLimit - used : (p.daily_limit ? p.daily_limit - used : null)
                    const reqPct = (p.daily_limit || isFreeLimited) ? Math.min(100, Math.round((used / dailyLimit) * 100)) : null
                    // Token tracking (all providers)
                    const tokenUsed = p.tokens_used_today ?? 0
                    const tokenLimit = p.token_daily_limit ?? null
                    const tokenPct = tokenLimit ? Math.min(100, Math.round((tokenUsed / tokenLimit) * 100)) : null
                    const isLow = (isFreeLimited && reqRemaining !== null && reqRemaining <= p.fallback_threshold * 2) ||
                                  (tokenLimit !== null && tokenPct !== null && tokenPct > 85)
                    const isToggling = togglingProvider === p.provider_name
                    const hasUsage = tokenUsed > 0 || used > 0

                    const freeList = providerConfigs.filter(p => p.provider_category === 'free' || p.provider_category === 'free_limited').sort((a, b) => a.priority - b.priority)
                    const freeIdx = freeList.findIndex(x => x.provider_name === p.provider_name)
                    return (
                      <div key={p.provider_name} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', marginBottom: '0.75rem', border: `1.5px solid ${p.is_enabled ? 'rgba(67,233,123,0.3)' : 'var(--border)'}` }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          {/* Sıralama okları */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flexShrink: 0 }}>
                            <button onClick={() => handleReorderProvider(p.provider_name, 'up')} disabled={freeIdx === 0} style={{ background: 'transparent', border: 'none', cursor: freeIdx === 0 ? 'default' : 'pointer', padding: '0.1rem', opacity: freeIdx === 0 ? 0.2 : 0.7 }}>
                              <ChevronUp size={16} color="var(--text-muted)" />
                            </button>
                            <button onClick={() => handleReorderProvider(p.provider_name, 'down')} disabled={freeIdx === freeList.length - 1} style={{ background: 'transparent', border: 'none', cursor: freeIdx === freeList.length - 1 ? 'default' : 'pointer', padding: '0.1rem', opacity: freeIdx === freeList.length - 1 ? 0.2 : 0.7 }}>
                              <ChevronDown size={16} color="var(--text-muted)" />
                            </button>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{p.display_name}</span>
                              <span style={{ fontSize: '0.66rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(67,233,123,0.1)', color: '#16a34a', fontWeight: 600 }}>ÜCRETSİZ</span>
                              {p.fallback_to && (
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>→ {p.fallback_to}</span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Model: {p.model_name} · Öncelik: {p.priority} · Toplam: {p.total_requests_made.toLocaleString()} istek
                            </p>
                          </div>
                          {/* Toggle */}
                          <button
                            onClick={() => handleToggleProvider(p.provider_name, p.is_enabled)}
                            disabled={isToggling}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', flexShrink: 0, opacity: isToggling ? 0.5 : 1 }}
                          >
                            {p.is_enabled
                              ? <ToggleRight size={32} color="#16a34a" />
                              : <ToggleLeft size={32} color="var(--text-muted)" />}
                          </button>
                        </div>

                        {/* Token kullanımı — sadece free (Groq gibi) için, free_limited (Gemini) için değil */}
                        {tokenLimit !== null && !isFreeLimited && (
                          <div style={{ marginBottom: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.3rem' }}>
                              <span style={{ color: tokenPct !== null && tokenPct > 85 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                                Token: {tokenUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
                              </span>
                              <span style={{ color: tokenPct !== null && tokenPct > 85 ? '#ef4444' : tokenPct !== null && tokenPct > 65 ? '#f59e0b' : '#16a34a', fontWeight: 700 }}>
                                %{tokenPct ?? 0}
                              </span>
                            </div>
                            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-soft)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '4px', width: `${tokenPct ?? 0}%`, background: tokenPct !== null && tokenPct > 85 ? '#ef4444' : tokenPct !== null && tokenPct > 65 ? '#f59e0b' : '#16a34a', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {/* İstek kullanımı (free_limited için % bar, diğerleri için sade metin) */}
                        {isFreeLimited && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: '0.3rem' }}>
                              <span style={{ color: isLow ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                                İstek: {used.toLocaleString()} / {dailyLimit.toLocaleString()}
                              </span>
                              <span style={{ color: reqPct !== null && reqPct > 85 ? '#ef4444' : reqPct !== null && reqPct > 65 ? '#f59e0b' : '#16a34a', fontWeight: 700 }}>
                                %{reqPct ?? 0}
                              </span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-soft)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '3px', width: `${reqPct ?? 0}%`, background: reqPct !== null && reqPct > 85 ? '#ef4444' : reqPct !== null && reqPct > 65 ? '#f59e0b' : '#16a34a', transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {/* Alt bilgi satırı */}
                        <div style={{ marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            Son sıfırlama: {p.last_reset_date} · Toplam token: {(p.total_tokens_used ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                {providerConfigs.filter(p => p.provider_category !== 'paid').length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem' }}>Ücretsiz sağlayıcı bulunamadı.</p>
                )}
              </div>
            )}

            {/* ÜCRETLİ SÜRÜMLER */}
            {providerSubTab === 'paid' && !providerLoading && (
              <div>
                {providerConfigs.filter(p => p.provider_category === 'paid').map(p => {
                  const isToggling = togglingProvider === p.provider_name
                  const paidList = providerConfigs.filter(p => p.provider_category === 'paid').sort((a, b) => a.priority - b.priority)
                  const paidIdx = paidList.findIndex(x => x.provider_name === p.provider_name)
                  return (
                    <div key={p.provider_name} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', marginBottom: '0.75rem', border: `1.5px solid ${p.is_enabled ? 'rgba(64,93,230,0.3)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        {/* Sıralama okları */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', flexShrink: 0 }}>
                          <button onClick={() => handleReorderProvider(p.provider_name, 'up')} disabled={paidIdx === 0} style={{ background: 'transparent', border: 'none', cursor: paidIdx === 0 ? 'default' : 'pointer', padding: '0.1rem', opacity: paidIdx === 0 ? 0.2 : 0.7 }}>
                            <ChevronUp size={16} color="var(--text-muted)" />
                          </button>
                          <button onClick={() => handleReorderProvider(p.provider_name, 'down')} disabled={paidIdx === paidList.length - 1} style={{ background: 'transparent', border: 'none', cursor: paidIdx === paidList.length - 1 ? 'default' : 'pointer', padding: '0.1rem', opacity: paidIdx === paidList.length - 1 ? 0.2 : 0.7 }}>
                            <ChevronDown size={16} color="var(--text-muted)" />
                          </button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{p.display_name}</span>
                            <span style={{ fontSize: '0.66rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(64,93,230,0.1)', color: 'var(--accent)', fontWeight: 600 }}>ÜCRETLİ</span>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Model: {p.model_name} · Öncelik: {p.priority} · Toplam: {p.total_requests_made.toLocaleString()} istek
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleProvider(p.provider_name, p.is_enabled)}
                          disabled={isToggling}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', flexShrink: 0, opacity: isToggling ? 0.5 : 1 }}
                        >
                          {p.is_enabled
                            ? <ToggleRight size={32} color="var(--accent)" />
                            : <ToggleLeft size={32} color="var(--text-muted)" />}
                        </button>
                      </div>

                      {/* Sync balance / billing link row */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {p.provider_name === 'deepseek' && (
                          <button
                            onClick={() => handleSyncBalance(p.provider_name)}
                            disabled={syncingBalance === p.provider_name}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', opacity: syncingBalance === p.provider_name ? 0.5 : 1 }}
                          >
                            <RefreshCw size={11} style={{ animation: syncingBalance === p.provider_name ? 'spin 1s linear infinite' : 'none' }} />
                            {deepseekBalance && p.provider_name === 'deepseek' ? `${deepseekBalance.total_balance} ${deepseekBalance.currency}` : 'Bakiyeyi Sorgula'}
                          </button>
                        )}
                        <a
                          href={
                            p.provider_name === 'openai' ? 'https://platform.openai.com/settings/organization/billing/overview' :
                            p.provider_name === 'deepseek' ? 'https://platform.deepseek.com/top_up' :
                            p.provider_name === 'gemini_paid' ? 'https://console.cloud.google.com/billing' : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(64,93,230,0.3)', background: 'rgba(64,93,230,0.05)', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', textDecoration: 'none' }}
                        >
                          <ExternalLink size={11} />
                          {p.provider_name === 'openai' ? 'OpenAI Bakiye' : p.provider_name === 'deepseek' ? 'DeepSeek Yükle' : 'Google Billing'}
                        </a>
                      </div>
                    </div>
                  )
                })}
                {providerConfigs.filter(p => p.provider_category === 'paid').length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem' }}>Ücretli sağlayıcı bulunamadı.</p>
                )}
              </div>
            )}

            {/* Action feedback toast */}
            {/* KULLANICI LİMİTLERİ */}
            {providerSubTab === 'settings' && (
              <div>
                {settingsLoading && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>}
                {!settingsLoading && settingsFetchError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '1.25rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.82rem', color: '#ef4444', marginBottom: '0.75rem' }}>Ayarlar yüklenemedi: {settingsFetchError}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>app_settings tablosu mevcut olmayabilir. SQL migration'ı çalıştırın veya varsayılan değerleri yükleyin.</p>
                    <button onClick={handleSeedDefaults} disabled={seedingDefaults} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: seedingDefaults ? 0.6 : 1 }}>
                      {seedingDefaults ? 'Yükleniyor...' : 'Varsayılan Ayarları Yükle'}
                    </button>
                  </div>
                )}
                {!settingsLoading && !settingsFetchError && appSettings.length === 0 && (
                  <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Henüz hiç ayar tanımlanmamış.</p>
                    <button onClick={handleSeedDefaults} disabled={seedingDefaults} style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: seedingDefaults ? 0.6 : 1 }}>
                      {seedingDefaults ? 'Yükleniyor...' : 'Varsayılan Ayarları Yükle'}
                    </button>
                  </div>
                )}
                {!settingsLoading && appSettings.map(s => (
                  <div key={s.key} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem', marginBottom: '0.75rem', border: '1.5px solid var(--border)' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>{s.key}</p>
                    {s.description && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>{s.description}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        className="input"
                        type="number"
                        value={settingsDraft[s.key] ?? s.value}
                        onChange={e => setSettingsDraft(prev => ({ ...prev, [s.key]: e.target.value }))}
                        style={{ flex: 1, height: '38px' }}
                      />
                      <button
                        onClick={() => handleSaveSetting(s.key)}
                        disabled={savingKey === s.key}
                        style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', background: 'var(--accent)', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: savingKey === s.key ? 0.6 : 1, whiteSpace: 'nowrap' }}
                      >
                        {savingKey === s.key ? '...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                ))}
                {settingsMsg && (
                  <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: settingsMsg.startsWith('Hata') ? '#ef4444' : 'var(--accent)', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, zIndex: 20000 }}>
                    {settingsMsg}
                  </div>
                )}
              </div>
            )}

            {providerActionMsg && (
              <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, zIndex: 20000 }}>
                {providerActionMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gutenberg Modal — full screen */}
      {showGutenberg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 1rem', paddingTop: 'env(safe-area-inset-top, 0px)', backdropFilter: 'blur(12px)' }}>
            <div style={{ height: '54px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => { setShowGutenberg(false); setGutenbergQuery(''); setGutenbergResults([]); setGutenbergLoading(false) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', flexShrink: 0 }}>
                <ArrowLeft size={22} color="var(--text)" />
              </button>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <SearchIcon size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                <input ref={gutenbergInputRef} className="input" value={gutenbergQuery} onChange={e => handleSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setGutenbergQuery(''); setGutenbergResults([]) } }} placeholder="Kitap adı veya yazar ara..." autoComplete="off" autoFocus style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: gutenbergQuery ? '2.25rem' : '0.75rem', height: '38px', borderRadius: '12px' }} />
                {gutenbergQuery && <button onClick={() => { setGutenbergQuery(''); setGutenbergResults([]); gutenbergInputRef.current?.focus() }} style={{ position: 'absolute', right: '0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}><X size={15} color="var(--text-muted)" /></button>}
              </div>
            </div>
            {gutenbergLoading && <div style={{ height: '2px', background: 'var(--border)', overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--accent)', animation: 'loadingBar 1s ease-in-out infinite', transformOrigin: 'left' }} /></div>}
            <div style={{ paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>70.000+ ücretsiz klasik kitap · tam metin</p>
              <button
                onClick={async () => {
                  if (!confirm('30 klasik kitap otomatik eklensin mi? Bu işlem ~5 dakika sürer.')) return
                  const res = await fetch('/api/gutenberg-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 30 }) })
                  const data = await res.json()
                  if (data.ok) alert(`✅ ${data.results.success} kitap eklendi!`)
                  else alert('Hata: ' + data.error)
                }}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'var(--accent)', border: 'none', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                ⚡ Hepsini Ekle
              </button>
              {gutenbergResults.length > 0 && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{gutenbergResults.length} sonuç</p>}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 1rem' }}>
            {gutenbergLoading && gutenbergResults.length === 0 && [1,2,3,4,5].map(n => <SkeletonRow key={n} />)}
            {!gutenbergLoading && gutenbergResults.length === 0 && gutenbergQuery.trim() && <NoResults q={gutenbergQuery} />}
            {!gutenbergLoading && gutenbergResults.length === 0 && !gutenbergQuery.trim() && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <BookOpen size={40} color="var(--border)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.35rem' }}>Kitap Ara</p>
                <p style={{ fontSize: '0.8rem' }}>Yazar veya kitap adı yazın</p>
              </div>
            )}
            {gutenbergResults.map((book, i) => {
              const key = String(book.id)
              const author = book.authors[0]?.name?.replace(/,\s*/, ' ').split(' ').reverse().join(' ') || ''
              const done = importedKeys.has(key)
              const active = importingKey === key
              return (
                <div key={key} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <CoverThumb src={book.formats['image/jpeg']} i={i} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                    {author && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{author}</p>}
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{book.download_count.toLocaleString()} indirme</p>
                  </div>
                  <button onClick={() => !done && !importingKey && importGutenbergBook(book)} disabled={active || done} style={{ flexShrink: 0, padding: '0.45rem 0.85rem', borderRadius: '10px', border: 'none', background: done ? 'rgba(67,233,123,0.15)' : active ? 'var(--bg-soft)' : 'var(--accent)', color: done ? '#16a34a' : active ? 'var(--text-muted)' : 'white', fontSize: '0.78rem', fontWeight: 700, cursor: done || !!importingKey ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '72px', justifyContent: 'center' }}>
                    {done ? <><Check size={13} /> Eklendi</> : active ? <>⏳ Çekiyor</> : <><Plus size={13} /> Ekle</>}
                  </button>
                </div>
              )
            })}
            <div style={{ height: '2rem' }} />
          </div>
          {importError && <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '0.6rem 1.25rem', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, zIndex: 20000, maxWidth: '90vw', textAlign: 'center' }}>Hata: {importError}</div>}
        </div>
      )}

      {/* Kitap Ekle/Düzenle Modal */}
      {showAddBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 1.5rem 0' }}>
              <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{editingBook ? 'Kitabı Düzenle' : 'Kataloğa Kitap Ekle'}</h3>
                <button onClick={() => { setShowAddBook(false); resetBookForm() }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
              </div>

              {/* Kapak */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Kapak Resmi</label>
                <input ref={coverRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleCoverSelect(e.target.files[0])} style={{ display: 'none' }} />
                <button onClick={() => coverRef.current?.click()} style={{ width: '100%', padding: '0.75rem', border: `2px dashed ${coverPreview ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', background: 'var(--bg-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {coverPreview
                    ? <img src={coverPreview} style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '6px' }} />
                    : generatingCover
                      ? <RefreshCw size={22} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                      : <Image size={22} color="var(--text-muted)" />}
                  <span style={{ fontSize: '0.85rem', color: coverPreview || generatingCover ? 'var(--accent)' : 'var(--text-muted)', fontWeight: coverPreview ? 600 : 400 }}>
                    {generatingCover ? 'AI kapak oluşturuluyor...' : coverPreview ? (generatedCoverUrl ? 'AI kapak oluşturuldu (değiştir)' : 'Kapak seçildi (değiştir)') : 'Galeriden kapak seç'}
                  </span>
                </button>
              </div>

              {/* PDF */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>İçerik (PDF veya metin)</label>
                <input ref={pdfRef} type="file" accept=".pdf,application/pdf" onChange={e => e.target.files?.[0] && handlePdfUpload(e.target.files[0])} style={{ display: 'none' }} />
                <button onClick={() => !pdfParsing && pdfRef.current?.click()} style={{ width: '100%', padding: '0.75rem', border: `2px dashed ${pdfFile ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', background: 'var(--bg-soft)', cursor: pdfParsing ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', marginBottom: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Upload size={18} color={pdfFile ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.85rem', color: pdfFile ? 'var(--accent)' : 'var(--text-muted)', flex: 1, textAlign: 'left' }}>
                      {pdfParsing ? `PDF okunuyor... %${pdfProgress}` : pdfFile ? `✓ ${pdfFile.name}` : 'PDF yükle'}
                    </span>
                    {pdfParsing && <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>{pdfProgress}%</span>}
                  </div>
                  {pdfParsing && (
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${pdfProgress}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
                    </div>
                  )}
                </button>
                <textarea className="input" value={bookContent} onChange={e => setBookContent(e.target.value)} placeholder="veya metni buraya yapıştır..." rows={3} style={{ resize: 'none' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Başlık *</label>
                <input className="input" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Kitap adı" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Yazar</label>
                <input className="input" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} placeholder="Yazar adı" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Açıklama</label>
                <textarea className="input" value={bookDesc} onChange={e => setBookDesc(e.target.value)} placeholder="Kitap hakkında..." rows={2} style={{ resize: 'none' }} />
              </div>

              {/* AI Sınıflandır */}
              <button
                onClick={() => handleAutoClassify(bookTitle, bookAuthor, bookDesc, bookContent)}
                disabled={autoClassifying || !bookTitle.trim()}
                style={{ width: '100%', marginBottom: '1rem', padding: '0.7rem', borderRadius: '12px', border: '1.5px solid var(--accent)', background: 'rgba(64,93,230,0.08)', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, cursor: bookTitle.trim() ? 'pointer' : 'not-allowed', opacity: bookTitle.trim() ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {autoClassifying ? '⏳ Sınıflandırılıyor...' : '🤖 AI ile Otomatik Sınıflandır'}
              </button>

              {/* Dil & Seviye */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Dil</label>
                  <select className="input" value={bookLanguage} onChange={e => setBookLanguage(e.target.value)}>
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="ru">Rusça</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                    <option value="es">İspanyolca</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Seviye</label>
                  <select className="input" value={bookLevel} onChange={e => setBookLevel(e.target.value)}>
                    <option value="">Belirtme</option>
                    {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Kategoriler */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Kategori</label>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                  {BOOK_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <button key={c.id} onClick={() => setBookCategories(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', borderRadius: '999px', border: `1.5px solid ${bookCategories.includes(c.id) ? 'var(--accent)' : 'var(--border)'}`, background: bookCategories.includes(c.id) ? 'rgba(64,93,230,0.1)' : 'transparent', color: bookCategories.includes(c.id) ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: bookCategories.includes(c.id) ? 700 : 400, cursor: 'pointer' }}>
                      <span>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" checked={bookPublished} onChange={e => setBookPublished(e.target.checked)} id="published" style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                <label htmlFor="published" style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Yayınla (hemen görünsün)</label>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <button onClick={handleSaveBook} disabled={saving || !bookTitle.trim() || pdfParsing || generatingCover} className="btn-primary" style={{ width: '100%', padding: '0.95rem', borderRadius: '14px', fontSize: '0.95rem', opacity: saving || !bookTitle.trim() || generatingCover ? 0.5 : 1 }}>
                {saving ? 'Kaydediliyor...' : editingBook ? 'Güncelle' : 'Kataloğa Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
