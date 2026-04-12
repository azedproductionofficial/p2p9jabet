import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Wallet, LogOut, LayoutDashboard, Swords, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(8,10,15,0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            padding: '4px 10px',
            borderRadius: '4px',
          }}>P2P</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '2px', color: 'var(--text)' }}>9JADUEL</span>
        </Link>

        {/* Nav links */}
        {user && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <NavLink to="/lobby" active={isActive('/lobby')} icon={<Swords size={15} />} label="Lobby" />
            <NavLink to="/dashboard" active={isActive('/dashboard')} icon={<LayoutDashboard size={15} />} label="My Bets" />
            <NavLink to="/wallet" active={isActive('/wallet')} icon={<Wallet size={15} />} label="Wallet" />
            {profile?.is_admin && (
              <NavLink to="/p9jadmin2025" active={isActive('/p9jadmin2025')} icon={<Shield size={15} />} label="Admin" color="var(--accent2)" />
            )}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{profile?.username || 'Player'}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  ₦{profile?.wallet_balance?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                style={{ background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/auth">
              <button style={{ background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                Get Started
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, active, icon, label, color }) {
  return (
    <Link to={to}>
      <button style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: active ? 'var(--card2)' : 'transparent',
        color: active ? (color || 'var(--accent)') : (color || 'var(--muted)'),
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
        fontFamily: 'var(--font-body)', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = color || 'var(--text)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = color || 'var(--muted)' }}
      >
        {icon}{label}
      </button>
    </Link>
  )
}
