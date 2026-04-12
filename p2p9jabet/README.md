# P2P9JaBet 🏆

Nigeria's first peer-to-peer sports betting platform. No bookmaker — just you vs them.

## How It Works

1. User A bets ₦1,000 on Arsenal
2. User B bets ₦1,000 on Southampton
3. System escrows both stakes
4. Arsenal wins → User A gets ₦1,850 (₦2,000 pool minus 15% fee on winnings)
5. Draw → Both get ₦950 back (5% fee on stake)

---

## Tech Stack

- **React + Vite** — Frontend
- **Supabase** — Auth, Database, Real-time
- **Paystack** — NGN payments
- **API-Football** (via RapidAPI) — Live fixtures
- **Netlify** — Hosting + CI/CD

---

## Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/azedproductionofficial/p2p9jabet.git
cd p2p9jabet
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the entire contents of `supabase_schema.sql`
3. Go to **Project Settings → API** and copy your:
   - Project URL
   - `anon` public key

### 3. API-Football Setup

1. Go to [rapidapi.com](https://rapidapi.com) and create a free account
2. Search for **API-Football** and subscribe to the free tier
3. Copy your RapidAPI key

### 4. Paystack Setup

1. Go to [paystack.com](https://paystack.com) and create an account
2. In Dashboard → Settings → API Keys, copy your **Public Key** (use Test key during dev)

### 5. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_RAPIDAPI_KEY=your_rapidapi_key
VITE_RAPIDAPI_HOST=api-football-v1.p.rapidapi.com
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxx
```

### 6. Run Locally

```bash
npm run dev
```

---

## Deploy to Netlify

### Connect GitHub → Netlify

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
3. Select your `p2p9jabet` repository
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**

### Add Environment Variables on Netlify

In Netlify → **Site Settings → Environment Variables**, add all 5 variables from your `.env`.

---

## GitHub Commands (First Push)

```bash
git init
git add .
git commit -m "Initial commit: P2P9JaBet v1.0"
git branch -M main
git remote add origin https://github.com/azedproductionofficial/p2p9jabet.git
git push -u origin main
```

---

## Folder Structure

```
src/
├── components/
│   ├── Navbar.jsx       — Top navigation bar
│   ├── FixtureCard.jsx  — Individual match card with bet buttons
│   └── BetSlip.jsx      — Bet placement modal
├── pages/
│   ├── Home.jsx         — Landing page
│   ├── Auth.jsx         — Sign in / Sign up
│   ├── Lobby.jsx        — Browse fixtures by league
│   ├── Dashboard.jsx    — User's bet history & stats
│   └── Wallet.jsx       — Deposit, withdraw, transactions
├── context/
│   └── AuthContext.jsx  — Global auth state
├── lib/
│   ├── supabase.js      — Supabase client
│   ├── sports-api.js    — API-Football integration
│   └── paystack.js      — Paystack + fee calculations
└── App.jsx              — Routes
```

---

## Fee Structure

| Outcome | Fee | What you receive |
|---------|-----|-----------------|
| Win | 15% of winnings | ₦1,850 on ₦1k stake |
| Draw | 5% of stake | ₦950 back per person |
| Loss | 0% | Stake goes to winner |

---

## Future Features (v2)

- [ ] In-app Paystack webhook verification
- [ ] Real-time bet matching notifications (Supabase Realtime)
- [ ] Admin dashboard for settling results
- [ ] Automatic result settlement via cron + API-Football
- [ ] Referral system
- [ ] Chat between matched opponents
- [ ] Mobile app (React Native)

---

## License

Private — All rights reserved © P2P9JaBet 2025
