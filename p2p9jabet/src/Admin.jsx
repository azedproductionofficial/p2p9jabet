import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Users, Wallet, TrendingUp, Shield, Ban, CheckCircle,
  XCircle, RefreshCw, Plus, Search, ChevronDown, ArrowUpRight
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])

    // Stats
    const totalBalance = (data || []).reduce((sum, u) => sum + (u.wallet_balance || 0), 0)
    setStats(prev => ({ ...prev, totalUsers: data?.length || 0, totalEscrow: totalBalance }))
  }

  async function loadBets() {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false })
    setBets(data || [])

    const totalStaked = (data || []).reduce((sum, b) => sum + (b.stake || 0), 0)
    const pending = (data || []).filter(b => b.status === 'pending').length
    const matched = (data || []).filter(b => b.status === 'matched').length
    setStats(prev => ({ ...prev, totalStaked, pendingBets: pending, matchedBets: matched }))
  }

  async function loadWithdrawals() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false })
    setWithdrawals(data || [])

    const pendingAmount = (data || [])
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    setStats(prev => ({ ...prev, pendingWithdrawals: pendingAmount }))
  }

  async function fundUser(userId, amount) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const newBalance = (user.wallet_balance || 0) + parseFloat(amount)
    const { error } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId)
    if (error) return toast.error(error.message)

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount: parseFloat(amount),
      reference: `ADMIN_FUND_${Date.now()}`,
      status: 'success',
      description: 'Admin wallet funding',
    })

    toast.success(`₦${parseFloat(amount).toLocaleString()} added to ${user.username}`)
    setFundUserId(null)
    setFundAmount('')
    loadUsers()
  }

  async function suspendUser(userId, isSuspended) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: !isSuspended })
      .eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success(`User ${!isSuspended ? 'suspended' : 'unsuspended'}`)
    loadUsers()
  }

  async function makeAdmin(userId, isAdmin) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !isAdmin })
      .eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success(`Admin status ${!isAdmin ? 'granted' : 'revoked'}`)
    loadUsers()
  }

  async function settleBet(betId, result) {
    const bet = bets.find(b => b.id === betId)
    if (!bet) return

    const { error } = await supabase
      .from('bets')
      .update({ status: result })
      .eq('id', betId)
    if (error) return toast.error(error.message)

    if (result === 'won') {
      const { payout } = { payout: bet.stake * 2 * 0.85 }
      const user = users.find(u => u.id === bet.user_id)
      if (user) {
        await supabase.from('profiles')
          .update({ wallet_balance: user.wallet_balance + payout })
          .eq('id', bet.user_id)
        await supabase.from('transactions').insert({
          user_id: bet.user_id,
          type: 'bet_won',
          amount: payout,
          reference: `WIN_${betId}`,
          status: 'success',
          description: `Bet won - ₦${payout.toLocaleString()} credited`,
        })
      }
    }

    if (result === 'draw') {
      const refund = bet.stake * 0.95
      const user = users.find(u => u.id === bet.user_id)
      if (user) {
        await supabase.from('profiles')
          .update({ wallet_balance: user.wallet_balance + refund })
          .eq('id', bet.user_id)
      }
    }

    toast.success(`Bet settled as ${result}`)
    loadBets()
    loadUsers()
  }

  async function markWithdrawalPaid(txId) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'success' })
      .eq('id', txId)
    if (error) return toast.error(error.message)
    toast.success('Withdrawal marked as paid')
    loadWithdrawals()
  }

  async function createUser() {
    if (!newEmail || !newPassword || !newUsername) return toast.error('Fill all fields')
    setCreating(true)
    try {
      // Create auth user
      const { data, error } = await supabase.auth.admin
        ? await supabase.auth.signUp({ email: newEmail, password: newPassword })
        : await supabase.auth.signUp({ email: newEmail, password: newPassword })

      if (error) throw error

      if (data.user) {
        // Wait a moment for trigger to create profile
        await new Promise(r => setTimeout(r, 1000))

        await supabase.from('profiles').update({
          username: newUsername,
          wallet_balance: parseFloat(newBalance) || 0,
          is_admin: newIsAdmin,
        }).eq('id', data.user.id)

        toast.success(`User ${newUsername} created successfully!`)
        setNewEmail(''); setNewPassword(''); setNewUsername(''); setNewBalance('0'); setNewIsAdmin(false)
        loadUsers()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '2px' }}>
      LOADING ADMIN...
    </div>
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

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
            <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? 'var(--accent)' : 'var(--card)', color: tab === t ? 'var(--bg)' : 'var(--muted)', border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`, padding: '8px 20px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>
              {t}
            </button>
          ))}
          <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '100px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'Overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <StatCard label="Total Users" value={stats.totalUsers || 0} icon={<Users size={16} />} />
              <StatCard label="Total Escrow" value={`₦${(stats.totalEscrow || 0).toLocaleString()}`} icon={<Wallet size={16} />} color="var(--accent)" mono />
              <StatCard label="Total Staked" value={`₦${(stats.totalStaked || 0).toLocaleString()}`} icon={<TrendingUp size={16} />} color="var(--accent2)" mono />
              <StatCard label="Pending Bets" value={stats.pendingBets || 0} icon={<RefreshCw size={16} />} color="var(--accent2)" />
              <StatCard label="Matched Bets" value={stats.matchedBets || 0} icon={<CheckCircle size={16} />} color="var(--accent)" />
              <StatCard label="Pending Withdrawals" value={`₦${(stats.pendingWithdrawals || 0).toLocaleString()}`} icon={<ArrowUpRight size={16} />} color="var(--red)" mono />
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'Users' && (
          <div>
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by username or email..."
                style={{ width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px 12px 36px', color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUsers.map(u => (
                <div key={u.id} style={{ background: 'var(--card)', border: `1px solid ${u.is_suspended ? 'rgba(255,59,59,0.3)' : 'var(--border)'}`, borderRadius: '14px', padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{u.username}</span>
                        {u.is_admin && <span style={{ fontSize: '0.7rem', background: 'rgba(0,232,122,0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(0,232,122,0.3)' }}>ADMIN</span>}
                        {u.is_suspended && <span style={{ fontSize: '0.7rem', background: 'rgba(255,59,59,0.1)', color: 'var(--red)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(255,59,59,0.3)' }}>SUSPENDED</span>}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '4px' }}>{u.email}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>₦{(u.wallet_balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Fund */}
                      {fundUserId === u.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={fundAmount}
                            onChange={e => setFundAmount(e.target.value)}
                            placeholder="Amount"
                            style={{ width: '100px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                          />
                          <AdminBtn onClick={() => fundUser(u.id, fundAmount)} color="var(--accent)" label="Confirm" />
                          <AdminBtn onClick={() => setFundUserId(null)} color="var(--muted)" label="Cancel" />
                        </div>
                      ) : (
                        <AdminBtn onClick={() => { setFundUserId(u.id); setFundAmount('') }} color="var(--accent)" label="Fund" icon={<Plus size={12} />} />
                      )}
                      <AdminBtn onClick={() => suspendUser(u.id, u.is_suspended)} color={u.is_suspended ? 'var(--accent)' : 'var(--red)'} label={u.is_suspended ? 'Unsuspend' : 'Suspend'} icon={u.is_suspended ? <CheckCircle size={12} /> : <Ban size={12} />} />
                      <AdminBtn onClick={() => makeAdmin(u.id, u.is_admin)} color="var(--accent2)" label={u.is_admin ? 'Revoke Admin' : 'Make Admin'} icon={<Shield size={12} />} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BETS TAB */}
        {tab === 'Bets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bets.map(bet => {
              const user = users.find(u => u.id === bet.user_id)
              return (
                <div key={bet.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>{user?.username || 'Unknown'} — <span style={{ color: 'var(--accent)' }}>{bet.prediction?.toUpperCase()}</span></p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>Fixture ID: {bet.fixture_id}</p>
                    <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>₦{(bet.stake || 0).toLocaleString()} · <span style={{ color: statusColor(bet.status) }}>{bet.status}</span></p>
                  </div>
                  {['pending', 'matched'].includes(bet.status) && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <AdminBtn onClick={() => settleBet(bet.id, 'won')} color="var(--accent)" label="Won" />
                      <AdminBtn onClick={() => settleBet(bet.id, 'lost')} color="var(--red)" label="Lost" />
                      <AdminBtn onClick={() => settleBet(bet.id, 'draw')} color="var(--accent2)" label="Draw" />
                      <AdminBtn onClick={() => settleBet(bet.id, 'refunded')} color="var(--muted)" label="Refund" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* WITHDRAWALS TAB */}
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
                    <AdminBtn onClick={() => markWithdrawalPaid(tx.id)} color="var(--accent)" label="Mark Paid" icon={<CheckCircle size={12} />} />
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

        {/* ADD USER TAB */}
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
              <button
                onClick={createUser}
                disabled={creating}
                style={{ width: '100%', background: creating ? 'var(--muted)' : 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}
              >
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
  const map = { pending: 'var(--accent2)', matched: '#00BFFF', won: 'var(--accent)', lost: 'var(--red)', draw: 'var(--accent2)', refunded: 'var(--muted)' }
  return map[status] || 'var(--muted)'
}
