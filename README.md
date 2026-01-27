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
│      PostgreSQL DB        │   │     Solana Localhost/Devnet  │
│  (Off-chain metadata)     │   │  (Token balances, mint/burn) │
└───────────────────────────┘   └──────────────────────────────┘
```

## Prerequisites

Ensure you have the following installed:

- **Rust** (1.70+)
- **Solana CLI** (1.18+) - `solana --version`
- **Anchor** (0.30+) - `anchor --version`
- **Node.js** (18+) - `node --version`
- **PostgreSQL** (14+) - Can use Windows PostgreSQL from WSL

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project root
cd blockchain-loyalty

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure PostgreSQL Database

**Option A: If using Windows PostgreSQL from WSL**

Find your Windows host IP:
```bash
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
# Note the IP (e.g., 172.31.16.1)
```

**Option B: If using Linux PostgreSQL**
```bash
sudo service postgresql start
```

Create the database:
```bash
# Replace <HOST_IP> with localhost or Windows host IP
psql -h <HOST_IP> -U postgres -d postgres -c "CREATE DATABASE loyalty_db;"
```

### 3. Setup Environment Variables

Create `.env` file in the **root directory**:

```env
# Solana
SOLANA_RPC_URL=http://127.0.0.1:8899
PROGRAM_ID=<your-program-id>

# PostgreSQL (update with your password and host IP)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST_IP:5432/loyalty_db

# Backend
PORT=3001
JWT_SECRET=change_this_to_a_secure_random_string
```

Create `.env` file in the **frontend directory** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_SOLANA_RPC_URL=http://localhost:8899
VITE_PROGRAM_ID=<your-program-id>
```

### 4. Start Solana Test Validator

Open a new terminal and run:
```bash
solana-test-validator
```

Keep this running in the background.

### 5. Configure Solana CLI

```bash
# Set to localhost
solana config set --url http://localhost:8899

# Check your configuration
solana config get
```

### 6. Build and Deploy Solana Program

```bash
# Build the program
anchor build

# Get the program ID
solana address -k target/deploy/loyalty_program-keypair.json

# Update PROGRAM_ID in both .env files with this address

# Deploy the program
solana program deploy target/deploy/loyalty_program.so
```

If deployment fails due to insufficient funds:
```bash
# Airdrop SOL to your wallet
solana airdrop 5
```

### 7. Run Database Migration

```bash
cd backend
npm run migrate
```

You should see: ✅ Database schema applied successfully

### 8. Start Backend Server

In a new terminal:
```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:3001`

### 9. Start Frontend Development Server

In another new terminal:
```bash
cd frontend
npm run dev
```

Frontend should be accessible at `http://localhost:5173`

### 10. Setup Solana Wallet

**Install a Solana wallet:**
- **Phantom**: https://phantom.app (most popular)
- **Solflare**: https://solflare.com
- **Backpack**: https://backpack.app

**Configure wallet for localhost:**
1. Open your wallet extension
2. Go to Settings → Network
3. Add Custom RPC: `http://localhost:8899`
4. Or set to "Localhost" if available

**Get test SOL:**
```bash
# Copy your wallet address from the wallet extension
solana airdrop 10 <YOUR_WALLET_ADDRESS>

# Verify balance
solana balance <YOUR_WALLET_ADDRESS>
```

### 11. Access the Application

1. Open browser to `http://localhost:5173`
2. Click "Connect Wallet"
3. Select your wallet (Phantom/Solflare/Backpack)
4. Approve the connection
5. You should see your SOL balance on the dashboard!

## Running Services Summary

You need **4 terminals running simultaneously**:

1. **Terminal 1**: `solana-test-validator` (Solana local validator)
2. **Terminal 2**: `cd backend && npm run dev` (Backend API)
3. **Terminal 3**: `cd frontend && npm run dev` (Frontend UI)
4. **Terminal 4**: Available for commands (airdrop, deploy, etc.)

## Troubleshooting

### Issue: Wallet shows 0 SOL
- Ensure wallet is connected to `http://localhost:8899`
- Run: `solana balance <YOUR_WALLET_ADDRESS>` to verify
- Airdrop more SOL if needed

### Issue: Frontend shows devnet instead of localhost
- Check `frontend/.env` has `VITE_SOLANA_RPC_URL=http://localhost:8899`
- Hard refresh browser (Ctrl+Shift+R)
- Restart frontend: `cd frontend && npm run dev`

### Issue: Database connection failed
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env` has correct password and host IP
- Test connection: `psql -h <HOST_IP> -U postgres -d loyalty_db`

### Issue: Program deployment fails
- Airdrop SOL to deployer: `solana airdrop 5`
- Check validator is running: `solana cluster-version`
- Rebuild: `anchor build`

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
