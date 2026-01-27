# Solana-Based Loyalty Points Platform

A public blockchain loyalty platform built on **Solana** enabling interchangeable loyalty points across multiple merchants.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│              Wallet Connect │ Consumer/Merchant Dashboards   │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────┐
│                     Backend API (Node.js)                    │
│         User Profiles │ Merchant Metadata │ Rewards Catalog  │
└─────────────┬───────────────────────────────────┬───────────┘
              │                                   │
┌─────────────┴─────────────┐   ┌─────────────────┴───────────┐
│      PostgreSQL DB        │   │        Solana Devnet         │
│  (Off-chain metadata)     │   │  (Token balances, mint/burn) │
└───────────────────────────┘   └──────────────────────────────┘
```

## Prerequisites

- **Rust** (1.70+)
- **Solana CLI** (1.18+)
- **Anchor** (0.30+)
- **Node.js** (18+)
- **PostgreSQL** (15+)

## Quick Start

### 1. Install Dependencies

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest

# Configure for Devnet
solana config set --url devnet
solana-keygen new
```

### 2. Build & Deploy Solana Program

```bash
cd programs/loyalty_program
anchor build
anchor deploy
```

### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate
npm run dev
```

### 4. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
/
├── programs/               # Solana smart contracts (Anchor)
│   └── loyalty_program/
├── backend/                # Node.js API server
├── frontend/               # React web application
├── shared/                 # Shared types and constants
└── README.md
```

## Key Features

- **Multi-merchant support**: Any registered merchant can issue points
- **Interchangeable tokens**: Points work across all merchants
- **On-chain ownership**: Consumers own tokens in their wallets
- **SPL token standard**: Full compatibility with Solana ecosystem
- **Public auditability**: All transactions verifiable on-chain

## Environment Variables

Create `.env` in root:

```env
# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<your-deployed-program-id>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/loyalty_db

# Backend
PORT=3001
JWT_SECRET=your-jwt-secret
```

## License

MIT
