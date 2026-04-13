import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateWinPayout, calculateDrawRefund } from '../lib/paystack'
import toast from 'react-hot-toast'

const MIN_BET = 100
const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000]

export default function BetSlip({ fixture, side, onClose }) {
  const { profile, refreshProfile } = useAuth()
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)

  const isDraw = side === 'draw'
  const teamLabel = side === 'home' ? fixture.home_team : side === 'away' ? fixture.away_team : 'Draw'

  const stakeNum = parseFloat(stake) || 0
  const payout = stakeNum > 0 ? (isDraw ? calculateDrawRefund(stakeNum) : calculateWinPayout(stakeNum)) : null

  async function placeBet() {
    if (!stakeNum || stakeNum < MIN_BET) return toast.error(`Minimum stake is ₦${MIN_BET}`)
    if (stakeNum > profile.wallet_balance) return toast.error('Insufficient wallet balance')

    setLoading(true)
    try {
      // Deduct from wallet
      const newBalance = profile.wallet_balance - stakeNum
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', profile.id)
      if (walletError) throw walletError

      // Place bet as pending first
      const { data: newBet, error: betError } = await supabase
        .from('bets')
        .insert({
          fixture_id: fixture.id,
          user_id: profile.id,
          prediction: side,
          stake: stakeNum,
          status: 'pending',
        })
        .select()
        .single()
      if (betError) throw betError

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'bet_placed',
        amount: -stakeNum,
        reference: newBet.id,
        status: 'success',
        description: `Bet: ${teamLabel} in ${fixture.home_team} vs ${fixture.away_team}`,
      })

      // Try to auto-match
      const matched = await tryAutoMatch(newBet, stakeNum)

      await refreshProfile()

      if (matched) {
        toast.success(`🔥 Matched instantly! Your bet is LIVE.`, { duration: 4000 })
      } else {
        toast.success(`Bet placed on ${teamLabel}! ₦${stakeNum.toLocaleString()} locked in escrow. Waiting for opponent.`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to place bet')
    } finally {
      setLoading(false)
    }
  }

  async function tryAutoMatch(newBet, stakeNum) {
    // Find opposite prediction with same stake on same fixture
    const oppositeSide = newBet.prediction === 'home' ? 'away'
      : newBet.prediction === 'away' ? 'home'
      : null // draw can only match draw

    const matchPrediction = oppositeSide || 'draw'

    // Don't match draw vs draw — draws match against both home and away
    const { data: matches } = await supabase
      .from('bets')
      .select('*')
      .eq('fixture_id', fixture.id)
      .eq('prediction', matchPrediction)
      .eq('stake', stakeNum)
      .eq('status', 'pending')
      .neq('user_id', profile.id)
      .limit(1)

    if (matches && matches.length > 0) {
      const match = matches[0]

      // Update BOTH bets to matched simultaneously
      const [res1, res2] = await Promise.all([
        supabase.from('bets')
          .update({ status: 'matched', matched_bet_id: newBet.id })
          .eq('id', match.id),
        supabase.from('bets')
          .update({ status: 'matched', matched_bet_id: match.id })
          .eq('id', newBet.id),
      ])

      if (res1.error || res2.error) return false
      return true
    }

    return false
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '32px', position: 'relative' }} onClick={e => e.stopPropagation()} className="fade-in">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>PLACING BET ON</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '1px', color: isDraw ? 'var(--accent2)' : 'var(--accent)' }}>{teamLabel.toUpperCase()}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px' }}>{fixture.home_team} vs {fixture.away_team}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>

        {/* Wallet balance */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Wallet Balance</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 500 }}>₦{profile?.wallet_balance?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>

        {/* Stake input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>STAKE AMOUNT (₦)</label>
          <input
            type="number"
            value={stake}
            onChange={e => setStake(e.target.value)}
            placeholder={`Min ₦${MIN_BET}`}
            min={MIN_BET}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text)', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Preset amounts */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {PRESET_AMOUNTS.map(amt => (
            <button key={amt} onClick={() => setStake(String(amt))} style={{ background: stake === String(amt) ? 'var(--accent)' : 'var(--card2)', color: stake === String(amt) ? 'var(--bg)' : 'var(--muted)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              ₦{(amt / 1000).toFixed(amt >= 1000 ? 0 : 1)}k
            </button>
          ))}
        </div>

        {/* Payout preview */}
        {payout && stakeNum >= MIN_BET && (
          <div style={{ background: 'var(--bg)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>PAYOUT PREVIEW</p>
            {isDraw ? (
              <>
                <Row label="Your stake" value={`₦${stakeNum.toLocaleString()}`} />
                <Row label="Platform fee (5%)" value={`-₦${payout.fee.toLocaleString()}`} color="var(--muted)" />
                <Row label="Refund if draw" value={`₦${payout.refund.toLocaleString()}`} color="var(--accent2)" bold />
              </>
            ) : (
              <>
                <Row label="Your stake" value={`₦${stakeNum.toLocaleString()}`} />
                <Row label="Opponent stake (matched)" value={`₦${stakeNum.toLocaleString()}`} />
                <Row label="Platform fee (15%)" value={`-₦${payout.fee.toLocaleString()}`} color="var(--muted)" />
                <Row label="If you win" value={`₦${payout.payout.toLocaleString()}`} color="var(--accent)" bold />
              </>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '20px', background: 'rgba(255,214,0,0.05)', border: '1px solid rgba(255,214,0,0.15)', borderRadius: '10px', padding: '12px' }}>
          <AlertCircle size={14} color="var(--accent2)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>Your stake is held in escrow until the match ends. If no match is found before kickoff, you get a full refund.</p>
        </div>

        <button
          onClick={placeBet}
          disabled={loading || !stakeNum || stakeNum < MIN_BET}
          style={{ width: '100%', background: loading || !stakeNum ? 'var(--muted)' : isDraw ? 'var(--accent2)' : 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
        >
          {loading ? 'Placing Bet...' : `Confirm — Bet on ${teamLabel}`}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: color || 'var(--text)', fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}
