import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchUpcomingFixtures, mapFixture, SUPPORTED_LEAGUES, LEAGUE_META } from '../lib/sports-api'
import { useAuth } from '../context/AuthContext'
import FixtureCard from '../components/FixtureCard'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function Lobby() {
  const { profile } = useAuth()
  const [fixtures, setFixtures] = useState([])
  const [userBets, setUserBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeLeague, setActiveLeague] = useState(17)
  const [apiMode, setApiMode] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    loadFixtures()
  }, [activeLeague])

  useEffect(() => {
    if (profile) loadUserBets()
  }, [profile])

  async function loadFixtures() {
    setLoading(true)
    setErrorMsg('')

    const hasApiKey = import.meta.env.VITE_RAPIDAPI_KEY &&
      import.meta.env.VITE_RAPIDAPI_KEY !== 'your_rapidapi_key'

    if (!hasApiKey) {
      setFixtures(getDemoFixtures(activeLeague))
      setApiMode('demo')
      setErrorMsg('No API key found in environment variables.')
      setLoading(false)
      return
    }

    try {
      console.log('Fetching fixtures for league:', activeLeague)
      const raw = await fetchUpcomingFixtures(activeLeague)
      console.log('API response:', raw)

      if (!raw || raw.length === 0) {
        setFixtures(getDemoFixtures(activeLeague))
        setApiMode('demo')
        setErrorMsg('API returned 0 fixtures. Showing demo data.')
      } else {
        const mapped = raw.map(mapFixture)
        console.log('Mapped fixtures:', mapped)
        setFixtures(mapped)
        setApiMode('live')
        setErrorMsg('')

        // Cache in Supabase if connected
        const hasSupabase = import.meta.env.VITE_SUPABASE_URL &&
          !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
        if (hasSupabase) {
          await supabase.from('fixtures').upsert(mapped, { onConflict: 'id' }).catch(() => {})
        }
      }
    } catch (err) {
      console.error('Fixture fetch error:', err)
      setFixtures(getDemoFixtures(activeLeague))
      setApiMode('demo')
      setErrorMsg(`API error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserBets() {
    try {
      const { data } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', profile.id)
        .in('status', ['pending', 'matched'])
      setUserBets(data || [])
    } catch (err) {
      console.error('Failed to load user bets:', err)
    }
  }

  const leagueNames = Object.fromEntries(
    Object.entries(LEAGUE_META).map(([id, meta]) => [id, meta.name])
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '6px' }}>LIVE BETTING LOBBY</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '2px' }}>PICK YOUR BATTLE</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.75rem',
              color: apiMode === 'live' ? 'var(--accent)' : apiMode === 'demo' ? 'var(--accent2)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {apiMode === 'live' ? <Wifi size={13} /> : <WifiOff size={13} />}
              {apiMode === 'live' ? 'Live Data' : apiMode === 'demo' ? 'Demo Mode' : 'Loading...'}
            </div>
            <button
              onClick={loadFixtures}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error message for debugging */}
        {errorMsg && (
          <div style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
            ⚠ {errorMsg}
          </div>
        )}

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
              {leagueNames[id] || `League ${id}`}
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
            <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '0.9rem' }}>No upcoming matches this week. Try another league.</p>
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

function getDemoFixtures(leagueId) {
  const name = LEAGUE_META[leagueId]?.name || 'Demo League'
  return [
    { id: 1001, league_id: leagueId, league_name: name, home_team: 'Arsenal', away_team: 'Manchester City', home_logo: 'https://media.api-sports.io/football/teams/42.png', away_logo: 'https://media.api-sports.io/football/teams/50.png', kickoff: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'NS' },
    { id: 1002, league_id: leagueId, league_name: name, home_team: 'Liverpool', away_team: 'Chelsea', home_logo: 'https://media.api-sports.io/football/teams/40.png', away_logo: 'https://media.api-sports.io/football/teams/49.png', kickoff: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'NS' },
    { id: 1003, league_id: leagueId, league_name: name, home_team: 'Manchester Utd', away_team: 'Tottenham', home_logo: 'https://media.api-sports.io/football/teams/33.png', away_logo: 'https://media.api-sports.io/football/teams/47.png', kickoff: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'NS' },
    { id: 1004, league_id: leagueId, league_name: name, home_team: 'Aston Villa', away_team: 'Newcastle', home_logo: 'https://media.api-sports.io/football/teams/66.png', away_logo: 'https://media.api-sports.io/football/teams/34.png', kickoff: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'NS' },
  ]
}
