import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { Trophy, Clock, XCircle, RefreshCw, Swords, TrendingUp } from 'lucide-react'

const STATUS_CONFIG = {
  pending:  { label: 'Waiting for Match', color: 'var(--accent2)', bg: 'rgba(255,214,0,0.1)', icon: <Clock size={13} /> },
  matched:  { label: 'Matched — Live', color: '#00BFFF', bg: 'rgba(0,191,255,0.1)', icon: <Swords size={13} /> },
  won:      { label: 'Won', color: 'var(--accent)', bg: 'rgba(0,232,122,0.1)', icon: <Trophy size={13} /> },
  lost:     { label: 'Lost', color: 'var(--red)', bg: 'rgba(255,59,59,0.1)', icon: <XCircle size={13} /> },
  draw:     { label: 'Draw', color: 'var(--accent2)', bg: 'rgba(255,214,0,0.1)', icon: <RefreshCw size={13} /> },
  refunded: { label: 'Refunded', color: 'var(--muted)', bg: 'rgba(90,106,130,0.1)', icon: <RefreshCw size={13} /> },
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [bets, setBets] = useState([])
  const [fixtures, setFixtures] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (profile) loadBets()
  }, [profile])

  async function loadBets() {
    setLoading(true)
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setBets(data || [])

    // Load fixture info for all bet fixture_ids
    if (data?.length) {
      const ids = [...new Set(data.map(b => b.fixture_id))]
      const { data: fixtureData } = await supabase.from('fixtures').select('*').in('id', ids)
      const map = {}
      fixtureData?.forEach(f => { map[f.id] = f })
      setFixtures(map)
    }
    setLoading(false)
  }

  const filtered = filter === 'all' ? bets : bets.filter(b => b.status === filter)

  const stats = {
    total: bets.length,
    won: bets.filter(b => b.status === 'won').length,
    lost: bets.filter(b => b.status === 'lost').length,
    active: bets.filter(b => ['pending', 'matched'].includes(b.status)).length,
    totalStaked: bets.reduce((sum, b) => sum + b.stake, 0),
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '6px' }}>MY ACCOUNT</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '2px' }}>BET HISTORY</h1>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          <StatCard label="Total Bets" value={stats.total} icon={<Swords size={16} />} />
          <StatCard label="Wins" value={stats.won} icon={<Trophy size={16} />} color="var(--accent)" />
          <StatCard label="Losses" value={stats.lost} icon={<XCircle size={16} />} color="var(--red)" />
          <StatCard label="Active" value={stats.active} icon={<Clock size={16} />} color="var(--accent2)" />
          <StatCard label="Total Staked" value={`₦${stats.totalStaked.toLocaleString()}`} icon={<TrendingUp size={16} />} mono />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'matched', 'won', 'lost', 'draw', 'refunded'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? 'var(--accent)' : 'var(--card)', color: filter === f ? 'var(--bg)' : 'var(--muted)', border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`, padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'var(--font-body)' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Bets list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--muted)', letterSpacing: '2px' }}>NO BETS YET</p>
            <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '0.9rem' }}>Head to the Lobby and place your first bet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(bet => {
              const fx = fixtures[bet.fixture_id]
              const cfg = STATUS_CONFIG[bet.status] || STATUS_CONFIG.pending
              const teamLabel = bet.prediction === 'home' ? fx?.home_team : bet.prediction === 'away' ? fx?.away_team : 'Draw'

              return (
                <div key={bet.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }} className="fade-in">
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                      {fx ? `${fx.home_team} vs ${fx.away_team}` : `Fixture #${bet.fixture_id}`}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700 }}>Backed: {teamLabel}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        {format(new Date(bet.created_at), 'dd MMM yyyy · HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}>₦{bet.stake.toLocaleString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: '100px', fontWeight: 600 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, mono }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>{label.toUpperCase()}</span>
        <span style={{ color: color || 'var(--muted)' }}>{icon}</span>
      </div>
      <p style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: '1.8rem', color: color || 'var(--text)', letterSpacing: mono ? '0' : '1px' }}>{value}</p>
    </div>
  )
}
