# Ethereum-Based Loyalty Points Platform

A public blockchain loyalty platform built on **Ethereum** enabling interchangeable loyalty points across multiple merchants.

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
│      PostgreSQL DB        │   │   Ethereum Localhost/Sepolia │
│  (Off-chain metadata)     │   │  (Token balances, mint/burn) │
└───────────────────────────┘   └──────────────────────────────┘
```

## Prerequisites

Ensure you have the following installed:

- **Node.js** (18+) - `node --version`
- **npm** or **yarn** - `npm --version`
- **PostgreSQL** (14+) - Can use Windows PostgreSQL from WSL
- **MetaMask** or other Ethereum wallet browser extension

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project root
cd blockchain-loyalty

# Install root dependencies (Hardhat)
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
# Ethereum
RPC_URL=http://localhost:8545
CHAIN_ID=1337
PLATFORM_ADDRESS=
PRIVATE_KEY=

# PostgreSQL (update with your password and host IP)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@HOST_IP:5432/loyalty_db

# Backend
PORT=3001

# For Sepolia Testnet
# CHAIN_ID=11155111
# RPC_URL=https://rpc.sepolia.org
```

Create `.env` file in the **frontend directory** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=1337
VITE_PLATFORM_ADDRESS=
VITE_WALLETCONNECT_PROJECT_ID=demo
```

### 4. Start Local Ethereum Node

Open a new terminal and run:
```bash
npx hardhat node
```

Keep this running in the background. This starts a local Ethereum blockchain on port 8545.

### 5. Compile and Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost

# Copy the deployed PLATFORM_ADDRESS from output to .env files
```

Update both `.env` files with the `PLATFORM_ADDRESS` from deployment output.

### 6. Run Database Migration

```bash
cd backend
npm run migrate
```

You should see: ✅ Database schema applied successfully

### 7. Start Backend Server

In a new terminal:
```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:3001`

### 8. Start Frontend Development Server

In another new terminal:
```bash
cd frontend
npm run dev
```

Frontend should be accessible at `http://localhost:5173`

### 9. Setup MetaMask Wallet

**Install MetaMask:**
- Visit: https://metamask.io
- Install browser extension
- Create or import wallet

**Configure MetaMask for localhost:**
1. Open MetaMask
2. Click network dropdown → Add Network
3. Enter:
   - Network Name: `Localhost 8545`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
4. Save and switch to this network

**Import test account (from Hardhat node):**
1. When you ran `npx hardhat node`, it displayed 20 test accounts
2. Copy a private key (Account #0 recommended)
3. In MetaMask: Click account icon → Import Account
4. Paste private key
5. You should see 10,000 ETH balance!

### 10. Access the Application

1. Open browser to `http://localhost:5173`
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve the connection
5. You should see your ETH balance on the dashboard!

## Running Services Summary

You need **3 terminals running simultaneously**:

1. **Terminal 1**: `npx hardhat node` (Local Ethereum blockchain)
2. **Terminal 2**: `cd backend && npm run dev` (Backend API)
3. **Terminal 3**: `cd frontend && npm run dev` (Frontend UI)

## Deploying to Sepolia Testnet

### 1. Get Sepolia ETH
- Visit a Sepolia faucet: https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum-sepolia
- Enter your wallet address
- Request test ETH (usually 0.5 ETH)

### 2. Update Configuration
Update `.env` in root:
```env
CHAIN_ID=11155111
RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
```

### 3. Deploy to Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Update Frontend
Update `frontend/.env`:
```env
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://rpc.sepolia.org
VITE_PLATFORM_ADDRESS=<deployed_address>
```

### 5. Configure MetaMask
- Switch network to "Sepolia Test Network"
- Import your account with PRIVATE_KEY
- Verify contract on Etherscan

## Troubleshooting

### Issue: Wallet shows 0 ETH
- Ensure MetaMask is connected to correct network (Localhost/Sepolia)
- Check Chain ID matches in wallet and .env files
- For localhost, use test accounts from `npx hardhat node`
- For Sepolia, get test ETH from faucet

### Issue: MetaMask can't connect
- Check .env has correct `VITE_RPC_URL` and `VITE_CHAIN_ID`
- Hard refresh browser (Ctrl+Shift+R)
- Reset MetaMask connection: Settings → Connected Sites → Disconnect
- Restart frontend: `cd frontend && npm run dev`

### Issue: Database connection failed
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env` has correct password and host IP
- Test connection: `psql -h <HOST_IP> -U postgres -d loyalty_db`

### Issue: Contract deployment fails
- Ensure you have enough ETH for gas
- For localhost: Check Hardhat node is running
- For Sepolia: Get test ETH from faucet
- Recompile: `npx hardhat compile`

### Issue: Transaction fails with "nonce too high"
- Reset MetaMask: Settings → Advanced → Clear Activity Tab Data
- Restart Hardhat node if on localhost

## Project Structure

```
/
├── contracts/              # Solidity smart contracts
│   ├── LoyaltyToken.sol
│   └── LoyaltyPlatform.sol
├── scripts/                # Deployment scripts
│   └── deploy.js
├── backend/                # Node.js API server
├── frontend/               # React web application
├── shared/                 # Shared types and constants
├── hardhat.config.js       # Hardhat configuration
└── README.md
```

## Key Features

- **Multi-merchant support**: Any registered merchant can issue points
- **Interchangeable tokens**: Points work across all merchants
- **On-chain ownership**: Consumers own tokens in their wallets
- **ERC-20 standard**: Full compatibility with Ethereum ecosystem
- **Public auditability**: All transactions verifiable on-chain
- **Protocol fees**: Platform collects fees on point minting
- **Dual payment**: Buy with ETH or loyalty points

## Smart Contract Architecture

### LoyaltyToken.sol
- ERC-20 compliant loyalty points token
- Controlled minting (only platform can mint)
- Max supply enforcement
- Burn functionality for redemptions

### LoyaltyPlatform.sol
- Main platform logic and access control
- Merchant registration and authorization
- Point minting with protocol fees
- Purchase tracking on-chain
- ETH/Points conversion
- Admin functions for platform management

## Technology Stack

**Blockchain:**
- Ethereum (Sepolia Testnet / Localhost)
- Solidity ^0.8.20
- Hardhat development environment
- OpenZeppelin contracts
- ethers.js v6

**Frontend:**
- React 18 with TypeScript
- Vite build tool
- wagmi + ConnectKit (wallet connection)
- TailwindCSS

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL database
- ethers.js for blockchain interaction

## Available Networks

### Localhost (Development)
- Chain ID: 1337
- RPC: http://localhost:8545
- Free, instant, private testing
- Run: `npx hardhat node`

### Sepolia Testnet (Public Testing)
- Chain ID: 11155111
- RPC: https://rpc.sepolia.org
- Free test ETH from faucets
- Public blockchain, persistent
- Explorer: https://sepolia.etherscan.io

### Ethereum Mainnet (Production)
- Chain ID: 1
- RPC: https://eth.llamarpc.com
- Real ETH required
- Production use only

## Environment Variables

Root `.env`:
```env
# Ethereum
RPC_URL=http://localhost:8545
CHAIN_ID=1337
PLATFORM_ADDRESS=
PRIVATE_KEY=

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/loyalty_db

# Backend
PORT=3001
```

Frontend `.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=1337
VITE_PLATFORM_ADDRESS=
VITE_WALLETCONNECT_PROJECT_ID=demo
```

## Commands Reference

```bash
# Hardhat
npx hardhat compile          # Compile contracts
npx hardhat node            # Start local blockchain
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat test            # Run tests

# Development
npm run dev                 # Root: N/A
cd backend && npm run dev   # Start backend server
cd frontend && npm run dev  # Start frontend dev server

# Database
cd backend && npm run migrate  # Run database migrations
```

## License

MIT

---

**Note:** This project has been migrated from Solana to Ethereum. Smart contracts are now written in Solidity, use ERC-20 tokens, and deploy via Hardhat instead of Anchor.
