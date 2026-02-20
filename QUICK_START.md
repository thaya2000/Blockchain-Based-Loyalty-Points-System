# ⚡ QUICK START CHECKLIST

Use this checklist to quickly set up and run the project.

## ☑️ PRE-FLIGHT CHECKLIST

Before starting, verify you have:

- [ ] Node.js (v18+) installed → `node --version`
- [ ] npm installed → `npm --version`
- [ ] PostgreSQL (v14+) installed → `psql --version`
- [ ] MetaMask browser extension installed
- [ ] Git installed → `git --version`

---

## 🚀 SETUP STEPS (Run Once)

### 1. Install Dependencies (5 minutes)
```powershell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System

# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ..\frontend
npm install
cd ..
```

- [ ] All dependencies installed without errors

### 2. Setup Database (2 minutes)
```powershell
# Open PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE loyalty_db;
\q

# Run migrations
cd backend
npm run migrate
cd ..
```

- [ ] Database created
- [ ] Migrations completed successfully

### 3. Create .env Files (3 minutes)

**Root `.env`:**
```env
RPC_URL=http://localhost:8545
CHAIN_ID=1337
PLATFORM_ADDRESS=
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/loyalty_db
PORT=3001
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3001
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=1337
VITE_PLATFORM_ADDRESS=
```

- [ ] Root .env created with database password
- [ ] Frontend .env created

---

## 🎮 RUNNING THE PROJECT (Every Time)

### Terminal 1: Start Blockchain (1 minute)
```powershell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System
npx hardhat node
```

- [ ] Hardhat node running
- [ ] Shows 20 accounts with 10000 ETH each
- [ ] **COPY Account #0 Private Key** (you'll need it!)

### Terminal 2: Deploy Contracts (2 minutes)
```powershell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System

# Compile
npx hardhat compile

# Deploy
npx hardhat run scripts\deploy.js --network localhost
```

- [ ] Contracts compiled successfully
- [ ] Contracts deployed successfully
- [ ] **COPY LoyaltyPlatform address** (starts with 0x...)

### Update .env Files:
```powershell
# Update both .env files with PLATFORM_ADDRESS from above
notepad .env
notepad frontend\.env
```

- [ ] PLATFORM_ADDRESS updated in root .env
- [ ] VITE_PLATFORM_ADDRESS updated in frontend .env

### Terminal 3: Start Backend (30 seconds)
```powershell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System\backend
npm run dev
```

- [ ] Backend running on http://localhost:3001
- [ ] Database connected successfully

### Terminal 4: Start Frontend (30 seconds)
```powershell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System\frontend
npm run dev
```

- [ ] Frontend running on http://localhost:5173
- [ ] No errors in console

---

## 🦊 METAMASK SETUP (One-Time, 5 minutes)

### Add Localhost Network:
1. [ ] Open MetaMask
2. [ ] Click network dropdown
3. [ ] "Add Network" → "Add Manually"
4. [ ] Enter details:
   - Network Name: **Localhost 8545**
   - RPC URL: **http://localhost:8545**
   - Chain ID: **1337**
   - Currency: **ETH**
5. [ ] Save and switch to this network

### Import Test Account:
1. [ ] Click account icon → "Import Account"
2. [ ] Paste Private Key from Terminal 1 (Account #0)
3. [ ] Import
4. [ ] Verify you see **10000 ETH** balance

---

## ✅ VERIFICATION CHECKLIST

Everything working? Check these:

- [ ] 4 PowerShell terminals are running
- [ ] Hardhat node shows activity
- [ ] Backend shows "Server running on http://localhost:3001"
- [ ] Frontend shows "Local: http://localhost:5173/"
- [ ] MetaMask is on "Localhost 8545" network
- [ ] MetaMask shows 10000 ETH balance
- [ ] Browser opens http://localhost:5173 without errors
- [ ] "Connect Wallet" button visible on homepage

---

## 🎯 FIRST USE CHECKLIST

### Connect Wallet:
- [ ] Click "Connect Wallet" button
- [ ] MetaMask popup appears
- [ ] Click "Next" → "Connect"
- [ ] Your address appears in navbar

### Register as Admin (Run once):
```powershell
# Open new PowerShell
cd d:\sem8\Cybersecurity_block\Blockchain_project\Blockchain-Based-Loyalty-Points-System

# Create admin registration script
@"
const hre = require('hardhat');

async function main() {
  const platformAddress = 'YOUR_PLATFORM_ADDRESS';
  const LoyaltyPlatform = await hre.ethers.getContractAt('LoyaltyPlatform', platformAddress);
  
  const merchantAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const mintAllowance = hre.ethers.parseEther('1000000');
  
  const tx = await LoyaltyPlatform.registerMerchant(merchantAddress, mintAllowance);
  await tx.wait();
  
  console.log('✅ Merchant registered!');
}

main().catch(console.error);
"@ | Out-File -FilePath setup-merchant.js

npx hardhat run setup-merchant.js --network localhost
```

- [ ] Script completed successfully

### Test Basic Functions:
- [ ] Can navigate to Dashboard
- [ ] Can navigate to Marketplace
- [ ] Can see products (if any)
- [ ] Can view wallet balance

---

## 🐛 QUICK TROUBLESHOOTING

### Problem: Can't connect to database
```powershell
# Check PostgreSQL service
Get-Service -Name *postgresql*

# Start if stopped
Start-Service postgresql-x64-14
```

### Problem: MetaMask shows "Wrong Network"
- [ ] Click MetaMask network dropdown
- [ ] Select "Localhost 8545"
- [ ] Refresh page

### Problem: "Cannot find PLATFORM_ADDRESS"
- [ ] Check .env files have the deployed address
- [ ] Restart frontend: `cd frontend && npm run dev`

### Problem: "Nonce too high"
- [ ] MetaMask → Settings → Advanced → Clear Activity Tab Data
- [ ] Restart Hardhat node

### Problem: No ETH in wallet
- [ ] Import Account #0 from Hardhat node
- [ ] Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## 🎉 SUCCESS INDICATORS

You're ready when you see:

✅ **Terminal 1:** Hardhat node logging transactions  
✅ **Terminal 2:** Deployment complete  
✅ **Terminal 3:** Backend server running  
✅ **Terminal 4:** Frontend ready  
✅ **Browser:** Application loads at http://localhost:5173  
✅ **MetaMask:** Connected with 10000 ETH  

---

## 🛑 SHUTDOWN CHECKLIST

When done testing:

1. [ ] Press `Ctrl+C` in Terminal 4 (Frontend)
2. [ ] Press `Ctrl+C` in Terminal 3 (Backend)
3. [ ] Press `Ctrl+C` in Terminal 1 (Hardhat)
4. [ ] Close all PowerShell windows
5. [ ] (Optional) Stop PostgreSQL service

⚠️ **Note:** Blockchain data is lost when you stop Hardhat node. You'll need to redeploy next time.

---

## 📋 DAILY STARTUP (After First Setup)

Quick reference for starting after initial setup:

```powershell
# Terminal 1
npx hardhat node

# Terminal 2 (wait for Terminal 1)
npx hardhat run scripts\deploy.js --network localhost
# Update .env files with new address!

# Terminal 3
cd backend && npm run dev

# Terminal 4
cd frontend && npm run dev

# Browser
# Open http://localhost:5173
# Connect MetaMask
```

**Total time:** ~3 minutes

---

## 📞 STUCK? CHECK THESE:

1. [ ] All 4 terminals running?
2. [ ] .env files have correct PLATFORM_ADDRESS?
3. [ ] MetaMask on "Localhost 8545"?
4. [ ] PostgreSQL service running?
5. [ ] No port conflicts? (8545, 3001, 5173)
6. [ ] Browser console shows no errors? (Press F12)

**Still stuck?** See [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md) for detailed troubleshooting.

---

**Happy Testing!** 🚀
