import { Link } from 'react-router-dom'
import { Swords, Shield, Zap, Trophy, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Grid bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.3,
        }} />
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,232,122,0.06) 0%, transparent 70%)', zIndex: 0 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '80px 1.5rem' }}>
          <div style={{ maxWidth: '700px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: '100px', padding: '6px 16px', marginBottom: '32px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '1px' }}>NIGERIA'S FIRST P2P SPORTS BETTING PLATFORM</span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 8vw, 6rem)', lineHeight: 0.95, letterSpacing: '2px', marginBottom: '24px' }}>
              YOU VS<br />
              <span style={{ color: 'var(--accent)' }}>THEM.</span><br />
              NO BOOKIES.
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--muted)', maxWidth: '500px', lineHeight: 1.7, marginBottom: '40px' }}>
              Place a bet on your team. Get matched with someone who thinks different.
              Winner takes all. No house edge — just pure conviction.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link to="/lobby">
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '1rem', padding: '16px 32px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Open Lobby <ArrowRight size={18} />
                </button>
              </Link>
              <Link to="/auth">
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem', padding: '16px 32px', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  Create Account
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '100px 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '16px', textTransform: 'uppercase' }}>How It Works</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', letterSpacing: '2px', marginBottom: '60px' }}>SIMPLE. FAIR. DIRECT.</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', color: 'var(--border)', position: 'absolute', top: '16px', right: '24px', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--accent)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee structure */}
      <section style={{ padding: '80px 0', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div className="container">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '16px', textTransform: 'uppercase' }}>Transparent Fees</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '2px', marginBottom: '40px' }}>NO HIDDEN CHARGES.</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '700px' }}>
            <FeeCard label="You Win" fee="15%" desc="of winnings only" color="var(--accent)" />
            <FeeCard label="It's a Draw" fee="5%" desc="of your stake" color="var(--accent2)" />
            <FeeCard label="You Lose" fee="0%" desc="stake goes to winner" color="var(--muted)" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 0', textAlign: 'center' }}>
        <div className="container">
          <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '3px', fontSize: '1.2rem', marginBottom: '8px' }}>P2P9JABET</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>© 2025 P2P9JaBet. Bet responsibly. 18+ only.</p>
        </div>
      </footer>
    </div>
  )
}

const steps = [
  { icon: <Zap size={20} />, title: 'Fund Your Wallet', desc: 'Deposit NGN via Paystack. Funds are secured in your wallet instantly.' },
  { icon: <Swords size={20} />, title: 'Pick a Game & Stake', desc: 'Browse live fixtures. Choose your team and enter your stake amount.' },
  { icon: <Shield size={20} />, title: 'Get Matched', desc: 'System finds someone who staked the same amount on the opposite side.' },
  { icon: <Trophy size={20} />, title: 'Winner Gets Paid', desc: 'After the match, the winner receives the full pot minus platform fee.' },
]

function FeeCard({ label, fee, desc, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color, letterSpacing: '2px', lineHeight: 1 }}>{fee}</p>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '6px' }}>{desc}</p>
    </div>
  )
}
