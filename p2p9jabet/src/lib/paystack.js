const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

export function initializePaystackDeposit({ email, amount, userId, onSuccess, onClose }) {
  // amount is in Naira — Paystack expects kobo (x100)
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amount * 100,
    currency: 'NGN',
    ref: `P9J_${userId}_${Date.now()}`,
    metadata: {
      user_id: userId,
      custom_fields: [
        {
          display_name: 'Platform',
          variable_name: 'platform',
          value: 'P2P9JaBet',
        },
      ],
    },
    callback: function (response) {
      onSuccess(response.reference)
    },
    onClose: function () {
      onClose?.()
    },
  })
  handler.openIframe()
}

// Fee calculations
export const FEES = {
  WIN_FEE_PERCENT: 15,       // 15% of winnings (the profit portion only)
  DRAW_FEE_PERCENT: 5,       // 5% of original stake
}

export function calculateWinPayout(stake) {
  const gross = stake * 2                        // total pool
  const profit = stake                           // the winnings portion
  const fee = (profit * FEES.WIN_FEE_PERCENT) / 100
  const payout = gross - fee
  return { gross, fee, payout }
}

export function calculateDrawRefund(stake) {
  const fee = (stake * FEES.DRAW_FEE_PERCENT) / 100
  const refund = stake - fee
  return { fee, refund }
}
