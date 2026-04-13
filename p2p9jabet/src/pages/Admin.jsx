import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Users, Wallet, TrendingUp, Shield, Ban, CheckCircle,
  RefreshCw, Plus, Search, ArrowUpRight, AlertTriangle
} from 'lucide-react'

const TABS = ['Overview', 'Users', 'Bets', 'Withdrawals', 'Add User']

export default function Admin() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [users, setUsers] = useState([])
  const [bets, setBets] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [settlingBetId, setSettlingBetId] = useState(null)

  // New user form
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newBalance, setNewBalance] = useState('0')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [creating, setCreating] = useState(false)

  // Fund user
  const [fundUserId, setFundUserId] = useState(null)
  const [fundAmount, setFundAmount] = useState('')

  useEffect(() => {
    if (!loading) {
      if (!profile) { navigate('/'); return }
      if (!profile.is_admin) { navigate('/'); return }
      loadAll()
    }
  }, [profile, loading])

  async function loadAll() {
    setDataLoading(true)
    await Promise.all([loadUsers(), loadBets(), loadWithdrawals()])
    setDataLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    const totalBalance = (data || []).reduce((sum, u) => sum + (u.wallet_balance || 0), 0)
    setStats(prev => ({ ...prev, totalUsers: data?.length || 0, totalEscrow: totalBalance }))
  }

  async function loadBets() {
    const { data } = await supabase.from('bets').select('*').order('created_at', { ascending: false })
    setBets(data || [])
    const totalStaked = (data || []).reduce((sum, b) => sum + (b.stake || 0), 0)
    const pending = (data || []).filter(b => b.status === 'pending').length
    const matched = (data || []).filter(b => b.status === 'matched').length
    setStats(prev => ({ ...prev, totalStaked, pendingBets: pending, matchedBets: matched }))
  }

  async function loadWithdrawals() {
    const { data } = await supabase.from('transactions').select('*').eq('type', 'withdrawal').order('created_at', { ascending: false })
    setWithdrawals(data || [])
    const pendingAmount = (data || []).filter(t => t.status === 'pending').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    setStats(prev => ({ ...prev, pendingWithdrawals: pendingAmount }))
  }

  async function fundUser(userId, amount) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const newBal = (user.wallet_balance || 0) + parseFloat(amount)
    const { error } = await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', userId)
    if (error) return toast.error(error.message)
    await supabase.from('transactions').insert({
      user_id: userId, type: 'deposit', amount: parseFloat(amount),
      reference: `ADMIN_FUND_${Date.now()}`, status: 'success', description: 'Admin wallet funding',
    })
    toast.success(`₦${parseFloat(amount).toLocaleString()} added to ${user.username}`)
    setFundUserId(null); setFundAmount(''); loadUsers()
  }

  async function suspendUser(userId, isSuspended) {
    const { error } = await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success(`User ${!isSuspended ? 'suspended' : 'unsuspended'}`); loadUsers()
  }

  async function makeAdmin(userId, isAdmin) {
    const { error } = await supabase.from('profiles').update({ is_admin: !isAdmin }).eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success(`Admin status ${!isAdmin ? 'granted' : 'revoked'}`); loadUsers()
  }

  async function settleBet(winnerBetId) {
    if (settlingBetId) return
    setSettlingBetId(winnerBetId)
    try {
      // Atomically update ONLY if status is still matched/pending — prevents race condition
      const { data: updatedBets, error: updateError } = await supabase
        .from('bets')
        .update({ status: 'won' })
        .eq('id', winnerBetId)
        .in('status', ['pending', 'matched'])
        .select()

      if (updateError || !updatedBets || updatedBets.length === 0) {
        toast.error('This bet has already been settled!')
        await loadUsers(); await loadBets()
        return
      }

      const freshBet = updatedBets[0]
      const loserBetId = freshBet.matched_bet_id
      if (loserBetId) {
        await supabase.from('bets').update({ status: 'lost' })
          .eq('id', loserBetId).in('status', ['pending', 'matched'])
      }

      // Fetch FRESH winner balance from DB before crediting
      const payout = freshBet.stake * 2 * 0.85
      const { data: freshWinner } = await supabase
        .from('profiles').select('wallet_balance, username').eq('id', freshBet.user_id).single()

      if (freshWinner) {
        const newBalance = (freshWinner.wallet_balance || 0) + payout
        await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', freshBet.user_id)
        await supabase.from('transactions').insert({
          user_id: freshBet.user_id, type: 'bet_won', amount: payout,
          reference: `WIN_${winnerBetId}_${Date.now()}`, status: 'success',
          description: `Bet won — ₦${payout.toLocaleString()} credited`,
        })
        toast.success(`✅ ${freshWinner.username} won! ₦${payout.toLocaleString()} credited.`)
      }

      await loadUsers()
      await loadBets()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSettlingBetId(null); setConfirm(null)
    }
  }

  async function settleDraw(betId) {
    if (settlingBetId) return
    setSettlingBetId(betId)
    try {
      // Check fresh status from DB
      const { data: freshCheck } = await supabase.from('bets').select('*').eq('id', betId).single()
      if (!freshCheck || !['pending', 'matched'].includes(freshCheck.status)) {
        toast.error('This bet has already been settled!')
        await loadAll()
        return
      }
      const bet = freshCheck
      const matchedBet = bet.matched_bet_id ? bets.find(b => b.id === bet.matched_bet_id) : null

      const bothBets = [bet, matchedBet].filter(Boolean)
      for (const b of bothBets) {
        await supabase.from('bets').update({ status: 'draw' }).eq('id', b.id)
        const refund = b.stake * 0.95
        const { data: freshU } = await supabase.from('profiles').select('wallet_balance').eq('id', b.user_id).single()
        if (freshU) {
          const newBal = (freshU.wallet_balance || 0) + refund
          await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', b.user_id)
          await supabase.from('transactions').insert({
            user_id: b.user_id, type: 'bet_refunded', amount: refund,
            reference: `DRAW_${b.id}_${Date.now()}`, status: 'success',
            description: `Draw refund — ₦${refund.toLocaleString()} returned`,
          })
        }
      }
      toast.success(`Draw settled. Both players refunded 95%.`)
      await loadUsers()
      await loadBets()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSettlingBetId(null); setConfirm(null)
    }
  }

  async function settleRefund(betId) {
    if (settlingBetId) return
    setSettlingBetId(betId)
    try {
      const bet = bets.find(b => b.id === betId)
      if (!bet) return
      await supabase.from('bets').update({ status: 'refunded' }).eq('id', betId)
      const { data: freshU } = await supabase.from('profiles').select('wallet_balance').eq('id', bet.user_id).single()
      if (freshU) {
        await supabase.from('profiles').update({ wallet_balance: (freshU.wallet_balance || 0) + bet.stake }).eq('id', bet.user_id)
      }
      toast.success(`Refunded ₦${bet.stake.toLocaleString()} to ${freshU?.username || 'user'}`)
      await loadUsers()
      await loadBets()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSettlingBetId(null); setConfirm(null)
    }
  }

  async function markWithdrawalPaid(txId) {
    const { error } = await supabase.from('transactions').update({ status: 'success' }).eq('id', txId)
    if (error) return toast.error(error.message)
    toast.success('Withdrawal marked as paid'); loadWithdrawals()
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newUsername) return toast.error('Fill all fields')
    setCreating(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email: newEmail, password: newPassword })
      if (error) throw error
      if (data.user) {
        await new Promise(r => setTimeout(r, 1000))
        await supabase.from('profiles').update({ username: newUsername, wallet_balance: parseFloat(newBalance) || 0, is_admin: newIsAdmin }).eq('id', data.user.id)
        toast.success(`User ${newUsername} created!`)
        setNewEmail(''); setNewPassword(''); setNewUsername(''); setNewBalance('0'); setNewIsAdmin(false)
        loadUsers()
      }
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  // Only show one side of each matched pair to avoid duplicates
  const displayBets = bets.filter(bet => {
    if (!bet.matched_bet_id) return true // unmatched, show it
    // For matched pairs, only show the one where this bet's id < matched_bet_id (show once)
    return bet.id < bet.matched_bet_id
  })

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '2px' }}>LOADING ADMIN...</div>
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

        {/* Confirmation Modal */}
        {confirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
              <AlertTriangle size={40} color="var(--accent2)" style={{ marginBottom: '16px' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '1px', marginBottom: '12px' }}>ARE YOU SURE?</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: 1.6 }}>{confirm.message}</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setConfirm(null)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700 }}>Cancel</button>
                <button onClick={confirm.onConfirm} style={{ flex: 1, background: 'var(--accent)', color: 'var(--bg)', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 800, border: 'none' }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Shield size={16} color="var(--accent)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px' }}>ADMIN PANEL</p>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '2px' }}>CONTROL CENTER</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? 'var(--accent)' : 'var(--card)', color: tab === t ? 'var(--bg)' : 'var(--muted)', border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`, padding: '8px 20px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>{t}</button>
          ))}
          <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '100px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <StatCard label="Total Users" value={stats.totalUsers || 0} icon={<Users size={16} />} />
            <StatCard label="Total Escrow" value={`₦${(stats.totalEscrow || 0).toLocaleString()}`} icon={<Wallet size={16} />} color="var(--accent)" mono />
            <StatCard label="Total Staked" value={`₦${(stats.totalStaked || 0).toLocaleString()}`} icon={<TrendingUp size={16} />} color="var(--accent2)" mono />
            <StatCard label="Pending Bets" value={stats.pendingBets || 0} icon={<RefreshCw size={16} />} color="var(--accent2)" />
            <StatCard label="Matched Bets" value={stats.matchedBets || 0} icon={<CheckCircle size={16} />} color="var(--accent)" />
            <StatCard label="Pending Withdrawals" value={`₦${(stats.pendingWithdrawals || 0).toLocaleString()}`} icon={<ArrowUpRight size={16} />} color="var(--red)" mono />
          </div>
        )}

        {/* USERS */}
        {tab === 'Users' && (
          <div>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username or email..." style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px 12px 36px', color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUsers.map(u => (
                <div key={u.id} style={{ background: 'var(--card)', border: `1px solid ${u.is_suspended ? 'rgba(255,59,59,0.3)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{u.username}</span>
                        {u.is_admin && <span style={{ fontSize: '0.7rem', background: 'rgba(0,232,122,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(0,232,122,0.3)' }}>ADMIN</span>}
                        {u.is_suspended && <span style={{ fontSize: '0.7rem', background: 'rgba(255,59,59,0.1)', color: 'var(--red)', padding: '2px 8px', borderRadius: '100px' }}>SUSPENDED</span>}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>{u.email}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>₦{(u.wallet_balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {fundUserId === u.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input type="number" value={fundAmount} onChange={e => setFundAmount(e.target.value)} placeholder="Amount" style={{ width: '100px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }} />
                          <AdminBtn onClick={() => setConfirm({ message: `Add ₦${parseFloat(fundAmount || 0).toLocaleString()} to ${u.username}'s wallet?`, onConfirm: () => fundUser(u.id, fundAmount) })} color="var(--accent)" label="Confirm" />
                          <AdminBtn onClick={() => setFundUserId(null)} color="var(--muted)" label="Cancel" />
                        </div>
                      ) : (
                        <AdminBtn onClick={() => { setFundUserId(u.id); setFundAmount('') }} color="var(--accent)" label="Fund" icon={<Plus size={12} />} />
                      )}
                      <AdminBtn onClick={() => setConfirm({ message: `${u.is_suspended ? 'Unsuspend' : 'Suspend'} ${u.username}?`, onConfirm: () => suspendUser(u.id, u.is_suspended) })} color={u.is_suspended ? 'var(--accent)' : 'var(--red)'} label={u.is_suspended ? 'Unsuspend' : 'Suspend'} icon={u.is_suspended ? <CheckCircle size={12} /> : <Ban size={12} />} />
                      <AdminBtn onClick={() => setConfirm({ message: `${u.is_admin ? 'Revoke admin from' : 'Grant admin to'} ${u.username}?`, onConfirm: () => makeAdmin(u.id, u.is_admin) })} color="var(--accent2)" label={u.is_admin ? 'Revoke Admin' : 'Make Admin'} icon={<Shield size={12} />} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BETS */}
        {tab === 'Bets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayBets.map(bet => {
              const user = users.find(u => u.id === bet.user_id)
              const matchedBet = bet.matched_bet_id ? bets.find(b => b.id === bet.matched_bet_id) : null
              const opponent = matchedBet ? users.find(u => u.id === matchedBet.user_id) : null
              const isSettling = settlingBetId === bet.id || settlingBetId === bet.matched_bet_id
              const alreadySettled = !['pending', 'matched'].includes(bet.status)

              return (
                <div key={bet.id} style={{ background: 'var(--card)', border: `1px solid ${alreadySettled ? 'var(--border)' : 'rgba(0,232,122,0.2)'}`, borderRadius: '14px', padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>
                        <span style={{ color: 'var(--accent)' }}>{user?.username || 'Unknown'}</span>
                        {opponent && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> vs <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>{opponent.username}</span></span>}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>
                        {user?.username} → <strong>{bet.prediction?.toUpperCase()}</strong>
                        {opponent && <> · {opponent.username} → <strong>{matchedBet?.prediction?.toUpperCase()}</strong></>}
                      </p>
                      <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        ₦{(bet.stake || 0).toLocaleString()} each · Pool: ₦{((bet.stake || 0) * 2).toLocaleString()} · <span style={{ color: statusColor(bet.status) }}>{bet.status}</span>
                      </p>
                    </div>

                    {/* Actions — only show if not settled */}
                    {!alreadySettled && !isSettling && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <AdminBtn
                          onClick={() => setConfirm({ message: `Declare ${user?.username} WON? ₦${((bet.stake || 0) * 2 * 0.85).toLocaleString()} will be credited to their wallet.`, onConfirm: () => settleBet(bet.id) })}
                          color="var(--accent)" label={`${user?.username?.split(' ')[0]} Won`}
                        />
                        {opponent && (
                          <AdminBtn
                            onClick={() => setConfirm({ message: `Declare ${opponent?.username} WON? ₦${((bet.stake || 0) * 2 * 0.85).toLocaleString()} will be credited to their wallet.`, onConfirm: () => settleBet(matchedBet.id) })}
                            color="var(--accent2)" label={`${opponent?.username?.split(' ')[0]} Won`}
                          />
                        )}
                        <AdminBtn onClick={() => setConfirm({ message: `Declare DRAW? Both players get 95% of ₦${(bet.stake || 0).toLocaleString()} back.`, onConfirm: () => settleDraw(bet.id) })} color="#00BFFF" label="Draw" />
                        <AdminBtn onClick={() => setConfirm({ message: `Refund ₦${(bet.stake || 0).toLocaleString()} to ${user?.username}?`, onConfirm: () => settleRefund(bet.id) })} color="var(--muted)" label="Refund" />
                      </div>
                    )}

                    {/* Settling spinner */}
                    {isSettling && (
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Settling...</span>
                    )}

                    {/* Already settled badge */}
                    {alreadySettled && (
                      <span style={{ fontSize: '0.8rem', color: statusColor(bet.status), fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'var(--bg)', padding: '6px 14px', borderRadius: '100px', border: `1px solid ${statusColor(bet.status)}`, whiteSpace: 'nowrap' }}>
                        {bet.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {displayBets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '1px' }}>NO BETS YET</p>
              </div>
            )}
          </div>
        )}

        {/* WITHDRAWALS */}
        {tab === 'Withdrawals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {withdrawals.map(tx => {
              const user = users.find(u => u.id === tx.user_id)
              return (
                <div key={tx.id} style={{ background: 'var(--card)', border: `1px solid ${tx.status === 'pending' ? 'rgba(255,214,0,0.3)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>{user?.username || 'Unknown'}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>{tx.description}</p>
                    <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>₦{Math.abs(tx.amount || 0).toLocaleString()} · <span style={{ color: tx.status === 'pending' ? 'var(--accent2)' : 'var(--accent)' }}>{tx.status}</span></p>
                  </div>
                  {tx.status === 'pending' && (
                    <AdminBtn onClick={() => setConfirm({ message: `Mark ₦${Math.abs(tx.amount).toLocaleString()} withdrawal for ${user?.username} as PAID?`, onConfirm: () => markWithdrawalPaid(tx.id) })} color="var(--accent)" label="Mark Paid" icon={<CheckCircle size={12} />} />
                  )}
                </div>
              )
            })}
            {withdrawals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '1px' }}>NO WITHDRAWALS YET</p>
              </div>
            )}
          </div>
        )}

        {/* ADD USER */}
        {tab === 'Add User' && (
          <div style={{ maxWidth: '500px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '2px', marginBottom: '24px' }}>CREATE USER</h2>
              <Field label="Username" value={newUsername} onChange={setNewUsername} placeholder="e.g. arsenal_boy" />
              <Field label="Email" value={newEmail} onChange={setNewEmail} placeholder="user@email.com" type="email" />
              <Field label="Password" value={newPassword} onChange={setNewPassword} placeholder="Min 6 characters" type="password" />
              <Field label="Starting Wallet Balance (₦)" value={newBalance} onChange={setNewBalance} placeholder="0" type="number" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <input type="checkbox" id="isAdmin" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="isAdmin" style={{ fontSize: '0.85rem', color: 'var(--muted)', cursor: 'pointer' }}>Grant admin privileges</label>
              </div>
              <button onClick={createUser} disabled={creating} style={{ width: '100%', background: creating ? 'var(--muted)' : 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
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
      <p style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontSize: '1.6rem', color: color || 'var(--text)', letterSpacing: mono ? '0' : '1px' }}>{value}</p>
    </div>
  )
}

function AdminBtn({ onClick, color, label, icon }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: `1px solid ${color}`, color, padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = 'var(--bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color }}
    >
      {icon}{label}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>{label.toUpperCase()}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '0.95rem', fontFamily: 'var(--font-body)' }} />
    </div>
  )
}

function statusColor(status) {
  const map = { pending: 'var(--accent2)', matched: '#00BFFF', won: 'var(--accent)', lost: 'var(--red)', draw: '#00BFFF', refunded: 'var(--muted)' }
  return map[status] || 'var(--muted)'
}
