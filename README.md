# Blockchain-Based Loyalty Points System

A full-stack blockchain loyalty platform built on **Solana** that enables merchants to issue and manage interchangeable loyalty points across a decentralized ecosystem.

---

## Overview

A complete solution for merchants and consumers to engage in a transparent, on-chain loyalty program. Customers earn and redeem loyalty points through purchases, merchants manage their product catalogs, and all transactions are recorded on the Solana blockchain for complete auditability.

### Key Capabilities

- **Multi-Merchant Ecosystem** — Decentralized network with self-registration and admin approval workflows
- **Dual Payment System** — Accept both SOL and loyalty points for purchases
- **On-chain Transactions** — All token operations executed atomically via Solana smart contracts
- **SPL Token Standard** — Full compatibility with Solana's Token Program ecosystem
- **Admin Dashboard** — Merchant approval, platform analytics, and system monitoring
- **Real-time Inventory** — Product catalog management with live stock tracking

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│              Wallet Adapter • User/Merchant Dashboards       │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST API
┌───────────────────────────┴────────────────────────────────────┐
│                  Backend API (Node.js + Express)               │
│         Authentication • Business Logic • Data Layer           │
└──────┬────────────────────────────────────────────┬────────────┘
       │                                            │
   ┌───┴──────────────────┐     ┌─────────────────┴──────────────┐
   │   PostgreSQL DB      │     │   Solana Blockchain            │
   │  (Off-chain Data)    │     │   (Token State + Transactions) │
   │  • Merchants         │     │   • SPL Token Balances         │
   │  • Products          │     │   • Transaction Records        │
   │  • Orders            │     │   • Program State              │
   └──────────────────────┘     └────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 4, React Router v6, Solana Wallet Adapter |
| **Backend** | Node.js, Express, TypeScript, PostgreSQL, tsx, Vitest |
| **Blockchain** | Solana, Anchor 0.30.1, Rust, SPL Token |

---

## Prerequisites

```
Node.js 18+       node --version
PostgreSQL 14+    psql --version
Rust 1.70+        rustc --version
Solana CLI 1.18+  solana --version
Anchor 0.30.1     anchor --version
```

### Browser Wallet

Install one of the following extensions:
- **Phantom** — https://phantom.app *(recommended)*
- **Solflare** — https://solflare.com
- **Backpack** — https://backpack.app

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/thaya2000/Blockchain-Based-Loyalty-Points-System.git
cd blockchain-loyalty

npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Environment Configuration

**`.env`** (project root):

```env
# Solana
SOLANA_RPC_URL=http://127.0.0.1:8899
PROGRAM_ID=9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj

# PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/loyalty_db

# Backend
PORT=3001
JWT_SECRET=your-secure-random-string

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj
VITE_PLATFORM_AUTHORITY=your-platform-authority-public-key
```

### 3. Start Local Validator

```bash
# Terminal 1
solana-test-validator

# Configure CLI
solana config set --url http://localhost:8899
```

### 4. Initialize Database

```bash
cd backend
npm run migrate
# ✅ Database schema applied successfully
```

### 5. Build & Deploy Smart Contract

```bash
anchor build

# Verify program ID
solana address -k target/deploy/loyalty_program-keypair.json

# Deploy
anchor deploy

# Fund deployer if needed
solana airdrop 5
```

### 6. Start Services

```bash
# Terminal 2 — Backend API
cd backend && npm run dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

### 7. Configure Wallet

1. Open your wallet extension → Settings → Network
2. Add custom RPC: `http://localhost:8899`
3. Fund your wallet:
   ```bash
   solana airdrop 10 <YOUR_WALLET_ADDRESS>
   ```

### 8. Open Application

Navigate to `http://localhost:5173` and connect your wallet.

---

## Project Structure

```
blockchain-loyalty/
├── programs/loyalty_program/    # Anchor smart contract (Rust)
│   └── src/
│       ├── lib.rs               # Program entry + instruction routing
│       ├── state.rs             # On-chain data structures
│       ├── errors.rs            # Custom error codes
│       └── instructions/        # Transaction handlers
│
├── backend/                     # Express API server (TypeScript)
│   └── src/
│       ├── server.ts            # App entry point
│       ├── db/                  # PostgreSQL layer + migrations
│       ├── routes/              # REST endpoints
│       ├── middleware/          # Auth middleware
│       └── services/            # Business logic + Solana integration
│
├── frontend/                    # React SPA (TypeScript + Vite)
│   └── src/
│       ├── App.tsx              # Root component + routing
│       ├── pages/               # Route-level views
│       ├── components/          # Reusable UI components
│       ├── context/             # React context providers
│       ├── services/            # API client
│       └── utils/               # Helpers
│
├── shared/                      # Shared types & constants
├── tests/                       # Anchor integration tests
├── scripts/                     # Setup & utility scripts
└── Anchor.toml                  # Anchor workspace config
```

---

## Smart Contract Instructions

| Instruction | Access | Description |
|-------------|--------|-------------|
| [`initialize_platform`](programs/loyalty_program/src/instructions/initialize.rs) | Admin | Bootstrap platform, create SPL token mint |
| [`register_merchant`](programs/loyalty_program/src/instructions/register_merchant.rs) | Admin | Authorize a new merchant |
| [`revoke_merchant`](programs/loyalty_program/src/instructions/revoke_merchant.rs) | Admin | Revoke merchant authorization |
| [`mint_points`](programs/loyalty_program/src/instructions/mint_points.rs) | Merchant | Mint loyalty points to a consumer |
| [`purchase_product_with_sol`](programs/loyalty_program/src/instructions/purchase_product.rs) | Consumer | Buy product with SOL, earn points |
| [`purchase_product_with_points`](programs/loyalty_program/src/instructions/purchase_with_points.rs) | Consumer | Buy product by burning points |
| [`redeem_points`](programs/loyalty_program/src/instructions/redeem_points.rs) | Consumer | Redeem points at a merchant |
| [`deposit_sol`](programs/loyalty_program/src/instructions/deposit_sol.rs) | Merchant | Deposit SOL to receive points |

---


*Built with Solana · Anchor · React · Node.js*
