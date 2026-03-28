'use client'
import { useState } from 'react'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, BookOpen, Check } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !username || !email || !password) { setError('Tüm alanları doldur'); return }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return }
    if (username.includes(' ')) { setError('Kullanıcı adında boşluk olamaz'); return }
    if (!isSupabaseConfigured) { setError(supabaseConfigError); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, username: username.toLowerCase() } },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setTimeout(() => router.push('/home'), 1500) }
  }

  if (success) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #43E97B, #38F9D7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={32} color="white" strokeWidth={3} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', textAlign: 'center' }}>Hoş geldin, {fullName.split(' ')[0]}!</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Okuma yolculuğun başlıyor...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '180px', background: 'linear-gradient(135deg, #405DE6 0%, #833AB4 50%, #C13584 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '0.75rem', marginBottom: '0.5rem' }}>
          <BookOpen size={28} color="white" strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'white', fontWeight: 400 }}>cognita</h1>
      </div>

      <div style={{ flex: 1, padding: '2rem 1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>Hesap oluştur</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>Topluluğa katıl</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Ad Soyad', value: fullName, setter: setFullName, type: 'text', placeholder: 'Mehmet Yılmaz' },
            { label: 'Kullanıcı Adı', value: username, setter: setUsername, type: 'text', placeholder: 'mehmet_okur' },
            { label: 'E-posta', value: email, setter: setEmail, type: 'email', placeholder: 'ornek@email.com' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>{f.label}</label>
              <input className="input" type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>Şifre</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter" style={{ paddingRight: '2.75rem' }} />
              <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: '10px', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!isSupabaseConfigured && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.2)', borderRadius: '10px', color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {supabaseConfigError}
          </div>
        )}

        <button className="btn-primary" onClick={handleRegister} disabled={loading || !isSupabaseConfigured} style={{ width: '100%', padding: '0.95rem', borderRadius: '12px', fontSize: '0.95rem', opacity: loading || !isSupabaseConfigured ? 0.7 : 1 }}>
          {loading ? 'Kaydediliyor...' : 'Hesap Oluştur'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Zaten hesabın var mı?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Giriş Yap</Link>
        </p>
      </div>
    </main>
  )
}
