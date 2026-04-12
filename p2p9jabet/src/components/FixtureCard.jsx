import { useState } from 'react'
import { format } from 'date-fns'
import BetSlip from './BetSlip'

export default function FixtureCard({ fixture, userBets = [] }) {
  const [showBetSlip, setShowBetSlip] = useState(false)
  const [selectedSide, setSelectedSide] = useState(null)

  const kickoff = new Date(fixture.kickoff)
  const isUpcoming = kickoff > new Date()

  const homeBets = userBets.filter(b => b.fixture_id === fixture.id && b.prediction === 'home')
  const awayBets = userBets.filter(b => b.fixture_id === fixture.id && b.prediction === 'away')

  function openBet(side) {
    setSelectedSide(side)
    setShowBetSlip(true)
  }

  return (
    <>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        transition: 'border-color 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,232,122,0.3)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {/* League & time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fixture.league_name}</span>
          <span style={{ fontSize: '0.75rem', color: isUpcoming ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-mono)', background: isUpcoming ? 'rgba(0,232,122,0.1)' : 'var(--card2)', padding: '3px 10px', borderRadius: '100px', border: `1px solid ${isUpcoming ? 'rgba(0,232,122,0.3)' : 'var(--border)'}` }}>
            {format(kickoff, 'EEE d MMM · HH:mm')}
          </span>
        </div>

        {/* Teams */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <TeamSide
            name={fixture.home_team}
            logo={fixture.home_logo}
            betCount={homeBets.length}
            side="home"
            onBet={() => openBet('home')}
            isUpcoming={isUpcoming}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--muted)', letterSpacing: '2px' }}>VS</div>
          </div>
          <TeamSide
            name={fixture.away_team}
            logo={fixture.away_logo}
            betCount={awayBets.length}
            side="away"
            onBet={() => openBet('away')}
            isUpcoming={isUpcoming}
            align="right"
          />
        </div>

        {/* Draw option */}
        {isUpcoming && (
          <button
            onClick={() => openBet('draw')}
            style={{ width: '100%', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            Bet on Draw (5% fee if correct)
          </button>
        )}
      </div>

      {showBetSlip && (
        <BetSlip
          fixture={fixture}
          side={selectedSide}
          onClose={() => setShowBetSlip(false)}
        />
      )}
    </>
  )
}

function TeamSide({ name, logo, betCount, onBet, isUpcoming, align = 'left' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
        {logo && <img src={logo} alt={name} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />}
        <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>{name}</span>
      </div>
      {betCount > 0 && (
        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', background: 'rgba(0,232,122,0.1)', padding: '2px 8px', borderRadius: '100px' }}>
          {betCount} open bet{betCount > 1 ? 's' : ''}
        </span>
      )}
      {isUpcoming && (
        <button
          onClick={onBet}
          style={{ background: 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '0.8rem', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)', transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Bet {name.split(' ')[0]}
        </button>
      )}
    </div>
  )
}
