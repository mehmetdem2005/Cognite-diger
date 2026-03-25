'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import { ArrowLeft, ChevronRight, Moon, Sun, Monitor, User, Mail, LogOut, Trash2, Camera, Volume2, Vibrate, Bell } from 'lucide-react'
import { applyTheme } from '@/lib/theme'

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState('light')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [hapticOn, setHapticOn] = useState(true)
  const [notifOn, setNotifOn] = useState(true)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

  useEffect(() => { if (!loading && !user) router.push('/auth/login') }, [user, loading])
  useEffect(() => { if (user) fetchProfile() }, [user])
  useEffect(() => {
    const t = localStorage.getItem('theme') || 'light'
    setTheme(t)
    setSoundOn(localStorage.getItem('cognita_sound') !== 'false')
    setHapticOn(localStorage.getItem('cognita_haptic') !== 'false')
    setNotifOn(localStorage.getItem('cognita_notif') !== 'false')
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)
  }, [])

  const toggleSound = (v: boolean) => { setSoundOn(v); localStorage.setItem('cognita_sound', String(v)) }
  const toggleHaptic = (v: boolean) => { setHapticOn(v); localStorage.setItem('cognita_haptic', String(v)) }
  const toggleNotif = async (v: boolean) => {
    setNotifOn(v); localStorage.setItem('cognita_notif', String(v))
    if (v && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
    }
  }

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    if (data) {
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || '')
    }
  }

  const handleTheme = (t: string) => {
    setTheme(t)
    applyTheme(t)
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return
    setUploading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/avatar-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')
      setAvatarUrl(data.url)
    } catch (e: any) {
      alert(`Fotoğraf yüklenemedi: ${e.message}`)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName, bio, avatar_url: avatarUrl || null }).eq('id', user.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => { await signOut(); router.push('/auth/login') }

  if (loading || !user) return <main style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 1rem', height: '54px', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => activeSection ? setActiveSection(null) : router.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={22} color="var(--text)" />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
          {activeSection === 'profile' ? 'Profili Düzenle' : 'Ayarlar'}
        </h1>
      </header>

      <div style={{ paddingTop: '1rem' }}>
        {activeSection === 'profile' ? (
          <div style={{ padding: '1rem' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: 'white', fontWeight: 700, overflow: 'hidden', border: '3px solid var(--border)' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl('')} />
                    : fullName?.[0]?.toUpperCase() || '?'}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Camera size={14} color="white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              </div>
              <p style={{ fontSize: '0.8rem', color: uploading ? 'var(--accent)' : 'var(--text-muted)' }}>
                {uploading ? '⏳ Yükleniyor...' : 'Fotoğrafı değiştirmek için tıkla'}
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border)' }}>
              {[
                { label: 'Ad Soyad', value: fullName, setter: setFullName, placeholder: 'Adın Soyadın' },
                { label: 'Biyografi', value: bio, setter: setBio, placeholder: 'Kendiniz hakkında bir şeyler yazın...' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{f.label}</label>
                  <input className="input" value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} />
                </div>
              ))}
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                {saved ? '✓ Kaydedildi!' : saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tema */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 1rem', marginBottom: '0.5rem' }}>GÖRÜNÜM</p>
              <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Tema</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { id: 'light', label: 'Aydınlık', icon: Sun },
                    { id: 'dark', label: 'Koyu', icon: Moon },
                    { id: 'system', label: 'Sistem', icon: Monitor },
                  ].map(t => {
                    const Icon = t.icon
                    const active = theme === t.id
                    return (
                      <button key={t.id} onClick={() => handleTheme(t.id)} style={{ flex: 1, padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'rgba(64,93,230,0.1)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: active ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}>
                        <Icon size={20} />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Tercihler */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 1rem', marginBottom: '0.5rem' }}>TERCİHLER</p>
              <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { icon: Volume2, label: 'Ses Efektleri', sub: 'Buton sesleri', value: soundOn, toggle: toggleSound },
                  { icon: Vibrate, label: 'Titreşim', sub: 'Haptic feedback (Android)', value: hapticOn, toggle: toggleHaptic },
                  { icon: Bell, label: 'Bildirimler', sub: notifPermission === 'denied' ? 'Tarayıcıda engellendi' : notifPermission === 'granted' ? 'İzin verildi' : 'İzin istenir', value: notifOn, toggle: toggleNotif, disabled: notifPermission === 'denied' },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.85rem 1rem', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <Icon size={18} color={item.disabled ? 'var(--text-muted)' : 'var(--text)'} strokeWidth={1.8} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.9rem', color: item.disabled ? 'var(--text-muted)' : 'var(--text)', fontWeight: 500 }}>{item.label}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{item.sub}</p>
                      </div>
                      <button
                        onClick={() => !item.disabled && item.toggle(!item.value)}
                        style={{ width: '44px', height: '26px', borderRadius: '13px', border: 'none', background: item.value && !item.disabled ? 'var(--accent)' : 'var(--bg-soft)', cursor: item.disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: item.disabled ? 0.5 : 1 }}
                      >
                        <div style={{ position: 'absolute', top: '3px', left: item.value && !item.disabled ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hesap */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 1rem', marginBottom: '0.5rem' }}>HESAP</p>
              <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { icon: User, label: 'Profili Düzenle', onClick: () => setActiveSection('profile') },
                  { icon: Mail, label: 'E-posta', value: user.email || '', onClick: () => {} },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <button key={i} onClick={item.onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', background: 'transparent', border: 'none', borderTop: i > 0 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                      <Icon size={18} color="var(--text)" strokeWidth={1.8} />
                      <span style={{ flex: 1, fontSize: '0.95rem', color: 'var(--text)', textAlign: 'left' }}>{item.label}</span>
                      {item.value && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.value}</span>}
                      <ChevronRight size={16} color="var(--border)" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Çıkış */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 1rem', marginBottom: '0.5rem' }}>HESAP AYARLARI</p>
              <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <LogOut size={18} color="var(--text)" strokeWidth={1.8} />
                  <span style={{ flex: 1, fontSize: '0.95rem', color: 'var(--text)', textAlign: 'left' }}>Oturumu Kapat</span>
                  <ChevronRight size={16} color="var(--border)" />
                </button>
                <button onClick={() => { if (confirm('Hesabını silmek istediğine emin misin?')) alert('Hesap silme desteği için destek ekibine yazın.') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
                  <Trash2 size={18} color="var(--red)" strokeWidth={1.8} />
                  <span style={{ flex: 1, fontSize: '0.95rem', color: 'var(--red)', textAlign: 'left' }}>Hesabı Sil</span>
                  <ChevronRight size={16} color="var(--border)" />
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.3rem' }}>cognita</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sürüm 1.0.0</p>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
