import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { initializePaystackDeposit } from '../lib/paystack'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const DEPOSIT_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000]

export default function Wallet() {
  const { user, profile, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [tab, setTab] = useState('deposit')
  const [processingDeposit, setProcessingDeposit] = useState(false)
  const [processingWithdraw, setProcessingWithdraw] = useState(false)

  useEffect(() => {
    if (profile) loadTransactions()
  }, [profile])

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setTransactions(data || [])
    setLoading(false)
  }

  function handleDeposit() {
    const amount = parseFloat(depositAmount)
    if (!amount || amount < 100) return toast.error('Minimum deposit is ₦100')
    setProcessingDeposit(true)

    // Load Paystack script dynamically if not present
    if (!window.PaystackPop) {
      const script = document.createElement('script')
      script.src = 'https://js.paystack.co/v1/inline.js'
      script.onload = () => openPaystack(amount)
      document.head.appendChild(script)
    } else {
      openPaystack(amount)
    }
  }

  function openPaystack(amount) {
    initializePaystackDeposit({
      email: user.email,
      amount,
      userId: profile.id,
      onSuccess: async (reference) => {
        // In production: verify on backend. For now, credit directly.
        const newBalance = profile.wallet_balance + amount
        await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id)
        await supabase.from('transactions').insert({
          user_id: profile.id,
          type: 'deposit',
          amount,
          reference,
          status: 'success',
          description: `Paystack deposit`,
        })
        await refreshProfile()
        await loadTransactions()
        setDepositAmount('')
        toast.success(`₦${amount.toLocaleString()} added to wallet!`)
        setProcessingDeposit(false)
      },
      onClose: () => {
        setProcessingDeposit(false)
        toast('Payment window closed')
      },
    })
  }

  async function handleWithdraw() {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount < 500) return toast.error('Minimum withdrawal is ₦500')
    if (amount > profile.wallet_balance) return toast.error('Insufficient balance')
    if (!withdrawAccount.trim()) return toast.error('Enter account details')

    setProcessingWithdraw(true)
    try {
      // Deduct balance and log withdrawal request
      const newBalance = profile.wallet_balance - amount
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', profile.id)
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'withdrawal',
        amount: -amount,
        reference: `WD_${profile.id}_${Date.now()}`,
        status: 'pending',
        description: `Withdrawal to: ${withdrawAccount}`,
      })
      await refreshProfile()
      await loadTransactions()
      setWithdrawAmount('')
      setWithdrawAccount('')
      toast.success('Withdrawal request submitted! Processing within 24hrs.')
    } catch (err) {
      toast.error(err.message || 'Withdrawal failed')
    } finally {
      setProcessingWithdraw(false)
    }
  }

  const txTypeConfig = {
    deposit:     { label: 'Deposit', color: 'var(--accent)', icon: <ArrowDownLeft size={14} />, sign: '+' },
    withdrawal:  { label: 'Withdrawal', color: 'var(--red)', icon: <ArrowUpRight size={14} />, sign: '-' },
    bet_placed:  { label: 'Bet Placed', color: 'var(--muted)', icon: null, sign: '-' },
    bet_won:     { label: 'Bet Won', color: 'var(--accent)', icon: <ArrowDownLeft size={14} />, sign: '+' },
    bet_refunded:{ label: 'Refunded', color: 'var(--accent2)', icon: <ArrowDownLeft size={14} />, sign: '+' },
    fee:         { label: 'Platform Fee', color: 'var(--muted)', icon: null, sign: '-' },
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '40px 0' }}>
      <div className="container">

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '3px', marginBottom: '6px' }}>WALLET</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '2px' }}>YOUR FUNDS</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

          {/* Left: Balance + deposit/withdraw */}
          <div>
            {/* Balance card */}
            <div style={{ background: 'linear-gradient(135deg, var(--card) 0%, var(--card2) 100%)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(0,232,122,0.05)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <WalletIcon size={18} color="var(--accent)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>AVAILABLE BALANCE</span>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', letterSpacing: '2px', color: 'var(--accent)', lineHeight: 1 }}>
                ₦{profile?.wallet_balance?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '8px' }}>{user?.email}</p>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
              {['deposit', 'withdraw'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--muted)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>

            {tab === 'deposit' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>AMOUNT (₦)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Min ₦100"
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text)', fontSize: '1.1rem', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {DEPOSIT_PRESETS.map(p => (
                    <button key={p} onClick={() => setDepositAmount(String(p))} style={{ background: depositAmount === String(p) ? 'var(--accent)' : 'var(--card2)', color: depositAmount === String(p) ? 'var(--bg)' : 'var(--muted)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      ₦{p >= 1000 ? `${p / 1000}k` : p}
                    </button>
                  ))}
                </div>
                <button onClick={handleDeposit} disabled={processingDeposit} style={{ width: '100%', background: processingDeposit ? 'var(--muted)' : 'var(--accent)', color: 'var(--bg)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: processingDeposit ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                  {processingDeposit ? 'Opening Paystack...' : 'Deposit via Paystack'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                  <AlertCircle size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>Withdrawals are processed manually within 24hrs. Minimum ₦500.</p>
                </div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>AMOUNT (₦)</label>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Min ₦500" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text)', fontSize: '1.1rem', fontFamily: 'var(--font-mono)', marginBottom: '12px' }} />
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>BANK ACCOUNT DETAILS</label>
                <input type="text" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} placeholder="Bank name · Account number · Account name" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', marginBottom: '20px' }} />
                <button onClick={handleWithdraw} disabled={processingWithdraw} style={{ width: '100%', background: processingWithdraw ? 'var(--muted)' : 'var(--red)', color: 'var(--text)', fontWeight: 800, fontSize: '1rem', padding: '14px', borderRadius: '10px', cursor: processingWithdraw ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                  {processingWithdraw ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Transaction history */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '1px', marginBottom: '20px' }}>TRANSACTIONS</h2>
            {loading ? (
              <p style={{ color: 'var(--muted)' }}>Loading...</p>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '1px' }}>NO TRANSACTIONS YET</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                {transactions.map(tx => {
                  const cfg = txTypeConfig[tx.type] || { label: tx.type, color: 'var(--muted)', sign: '' }
                  const isPositive = tx.amount > 0
                  return (
                    <div key={tx.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '3px' }}>{cfg.label}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{format(new Date(tx.created_at), 'dd MMM yyyy · HH:mm')}</p>
                        {tx.description && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>{tx.description}</p>}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: isPositive ? 'var(--accent)' : 'var(--text)' }}>
                        {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
