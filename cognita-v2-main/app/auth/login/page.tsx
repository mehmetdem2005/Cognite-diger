'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Tüm alanları doldur'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : error.message); setLoading(false) }
    else router.push('/home')
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Üst dekorasyon */}
      <div style={{ height: '220px', background: 'linear-gradient(135deg, #405DE6 0%, #833AB4 50%, #C13584 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'4\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', opacity: 0.5 }} />
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '1rem', marginBottom: '0.75rem' }}>
          <BookOpen size={32} color="white" strokeWidth={1.5} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'white', fontWeight: 400 }}>cognita</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Kitapseverlerin dünyası</p>
      </div>

      <div style={{ flex: 1, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>Tekrar hoş geldin</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Okuma macerana devam et</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>E-posta</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@email.com" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-soft)', marginBottom: '0.4rem' }}>Şifre</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ paddingRight: '2.75rem' }} />
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

        <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '0.95rem', borderRadius: '12px', fontSize: '0.95rem' }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Hesabın yok mu?{' '}
            <Link href="/auth/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Kayıt Ol</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
