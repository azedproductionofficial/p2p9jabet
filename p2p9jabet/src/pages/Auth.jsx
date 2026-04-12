import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function Auth() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!username.trim()) return toast.error('Username is required')
        await signUp(email, password, username.trim().toLowerCase())
        toast.success('Account created! Check your email to verify.')
      } else {
        await signIn(email, password)
        toast.success('Welcome back!')
        navigate('/lobby')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 1.5rem', position: 'relative' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,232,122,0.04) 0%, transparent 60%)' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', letterSpacing: '3px', marginBottom: '8px' }}>
            {mode === 'signin' ? 'WELCOME BACK' : 'JOIN THE GAME'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {mode === 'signin' ? 'Sign in to your P2P9JaBet account' : 'Create your account and start betting'}
          </p>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px' }}>
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <Field label="Username" value={username} onChange={setUsername} placeholder="e.g. arsenal_boy" type="text" />
            )}
            <Field label="Email" value={email} onChange={setEmail} placeholder="your@email.com" type="email" />
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 44px 12px 14px', color: 'var(--text)', fontSize: '0.95rem' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--muted)', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? 'var(--muted)' : 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: '0.5px' }}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{ background: 'none', color: 'var(--muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{mode === 'signin' ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '0.95rem' }}
      />
    </div>
  )
}
