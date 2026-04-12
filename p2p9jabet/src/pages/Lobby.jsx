import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUpcomingFixtures, mapFixture, SUPPORTED_LEAGUES } from '../lib/sports-api'
import { useAuth } from '../context/AuthContext'
import FixtureCard from '../components/FixtureCard'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

const LEAGUE_NAMES = {
  39: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  235: 'NPFL 🇳🇬',
  140: 'La Liga 🇪🇸',
  78: 'Bundesliga 🇩🇪',
  135: 'Serie A 🇮🇹',
}

export default function Lobby() {
  const { profile } = useAuth()
  const [fixtures, setFixtures] = useState([])
  const [userBets, setUserBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeLeague, setActiveLeague] = useState(39)
  const [apiMode, setApiMode] = useState('live') // live | demo

  useEffect(() => {
    loadFixtures()
  }, [activeLeague])

  useEffect(() => {
    if (profile) loadUserBets()
  }, [profile])

  async function loadFixtures() {
    setLoading(true)
    try {
      const raw = await fetchUpcomingFixtures(activeLeague)
      if (raw.length === 0) {
        // fallback to DB cached fixtures
        const { data } = await supabase
          .from('fixtures')
          .select('*')
          .eq('league_id', activeLeague)
          .eq('status', 'NS')
          .order('kickoff', { ascending: true })
          .limit(20)
        setFixtures(data || [])
        setApiMode('cached')
      } else {
        const mapped = raw.map(mapFixture)
        // Upsert into DB for caching
        await supabase.from('fixtures').upsert(mapped, { onConflict: 'id' })
        setFixtures(mapped)
        setApiMode('live')
      }
    } catch (err) {
      // fallback to DB
      const { data } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league_id', activeLeague)
        .eq('status', 'NS')
        .order('kickoff', { ascending: true })
        .limit(20)
      setFixtures(data || [])
      setApiMode('cached')
      if (!data?.length) toast.error('Could not load fixtures. Check API key.')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserBets() {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', profile.id)
      .in('status', ['pending', 'matched'])
    setUserBets(data || [])
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '6px' }}>LIVE BETTING LOBBY</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '2px' }}>PICK YOUR BATTLE</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: apiMode === 'live' ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {apiMode === 'live' ? <Wifi size={13} /> : <WifiOff size={13} />}
              {apiMode === 'live' ? 'Live Data' : 'Cached'}
            </div>
            <button onClick={loadFixtures} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* League tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '4px' }}>
          {SUPPORTED_LEAGUES.map(id => (
            <button
              key={id}
              onClick={() => setActiveLeague(id)}
              style={{
                whiteSpace: 'nowrap',
                background: activeLeague === id ? 'var(--accent)' : 'var(--card)',
                color: activeLeague === id ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid ${activeLeague === id ? 'var(--accent)' : 'var(--border)'}`,
                padding: '8px 16px', borderRadius: '100px', fontSize: '0.82rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
              }}
            >
              {LEAGUE_NAMES[id]}
            </button>
          ))}
        </div>

        {/* Fixtures grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', height: '200px', animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        ) : fixtures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--muted)', letterSpacing: '2px' }}>NO FIXTURES FOUND</p>
            <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '0.9rem' }}>Check back closer to the weekend or try another league.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {fixtures.map(f => (
              <FixtureCard key={f.id} fixture={f} userBets={userBets} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
