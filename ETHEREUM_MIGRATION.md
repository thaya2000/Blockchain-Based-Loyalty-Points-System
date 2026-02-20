# Solana to Ethereum Migration Guide

## Overview
This document outlines the complete migration from Solana to Ethereum blockchain.

## What Changed

### 1. Smart Contracts
| Aspect | Solana (Before) | Ethereum (After) |
|--------|----------------|------------------|
| **Language** | Rust | Solidity |
| **Framework** | Anchor | Hardhat |
| **Token Standard** | SPL Token | ERC-20 |
| **Files** | `programs/loyalty_program/src/*.rs` | `contracts/*.sol` |
| **Account Model** | PDA-based accounts | Address-based storage |
| **Deployment** | `anchor deploy` | `npx hardhat run scripts/deploy.js` |

### 2. Frontend Changes
| Aspect | Solana | Ethereum |
|--------|--------|----------|
| **Library** | `@solana/web3.js` | `ethers.js v6` |
| **Wallet Provider** | `@solana/wallet-adapter-react` | `wagmi` + `connectkit` |
| **Wallets** | Phantom, Solflare, Backpack | MetaMask, WalletConnect, Coinbase |
| **Service Files** | `services/solana.ts` | `services/ethereum.ts` |
| **Payment Service** | `services/payment.ts` | `services/payment-ethereum.ts` |

### 3. Backend Changes
| Aspect | Solana | Ethereum |
|--------|--------|----------|
| **Service** | `solana.service.ts` | `ethereum.service.ts` |
| **Library** | `@solana/web3.js` | `ethers.js v6` |
| **Connection** | `Connection` to RPC | `JsonRpcProvider` |

### 4. Configuration Changes
| File | Solana | Ethereum |
|------|--------|----------|
| **Root Config** | `Anchor.toml` | `hardhat.config.js` |
| **Constants** | `PROGRAM_ID`, `SOLANA_RPC_URL` | `PLATFORM_ADDRESS`, `RPC_URL`, `CHAIN_ID` |
| **Decimals** | 6 (SPL standard) | 18 (ERC-20 standard) |

## File Mapping

### New Files Created
```
✅ hardhat.config.js                    - Hardhat configuration
✅ contracts/LoyaltyToken.sol           - ERC-20 token contract
✅ contracts/LoyaltyPlatform.sol        - Main platform contract
✅ scripts/deploy.js                    - Deployment script
✅ frontend/src/services/ethereum.ts    - Ethereum service
✅ frontend/src/services/payment-ethereum.ts - Payment service
✅ backend/src/services/ethereum.service.ts  - Backend Ethereum service
```

### Files to Remove (Old Solana files)
```
❌ Anchor.toml
❌ programs/loyalty_program/src/**
❌ frontend/src/services/solana.ts
❌ frontend/src/services/payment.ts
❌ backend/src/services/solana.service.ts
```

### Files Modified
```
📝 package.json                    - Updated dependencies
📝 frontend/package.json           - Replaced Solana libs with Ethereum
📝 backend/package.json            - Replaced Solana libs with ethers.js
📝 frontend/src/App.tsx            - Changed wallet providers
📝 shared/constants.ts             - Updated blockchain constants
📝 README.md                       - Complete rewrite for Ethereum
```

## Key Differences in Implementation

### 1. Account Model
**Solana:**
```rust
// PDA (Program Derived Address) for deterministic accounts
let (platform_state, bump) = PublicKey::find_program_address(
    &[b"platform_state"],
    program_id
);
```

**Ethereum:**
```solidity
// Storage in contract state
mapping(address => MerchantRecord) public merchants;
```

### 2. Token Minting
**Solana (Rust/Anchor):**
```rust
mint_to(
    CpiContext::new_with_signer(...),
    amount,
)?;
```

**Ethereum (Solidity):**
```solidity
function mint(address to, uint256 amount) external onlyOwner {
    _mint(to, amount);
}
```

### 3. Wallet Connection
**Solana (React):**
```tsx
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signTransaction } = useWallet();
```

**Ethereum (React):**
```tsx
import { useAccount, useConnect } from 'wagmi';

const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();
```

### 4. Transaction Sending
**Solana:**
```typescript
const tx = await program.methods
  .mintPoints(amount, reference)
  .accounts({...})
  .rpc();
```

**Ethereum:**
```typescript
const tx = await platform.mintPoints(
  consumer,
  amount,
  reference,
  { value: fee }
);
await tx.wait();
```

## Network Comparison

| Feature | Solana | Ethereum |
|---------|--------|----------|
| **Local Dev** | `solana-test-validator` | `npx hardhat node` |
| **Testnet** | Devnet | Sepolia |
| **Test Funds** | `solana airdrop` | Faucet websites |
| **Transaction Speed** | ~400ms | ~12-15 seconds |
| **Transaction Cost (Testnet)** | ~0.00025 SOL (free) | ~0.0001 ETH (free) |
| **Transaction Cost (Mainnet)** | ~$0.00025 | $1-50 USD |
| **Explorer** | explorer.solana.com | etherscan.io |

## Migration Benefits

### Advantages of Ethereum
✅ Larger developer community  
✅ More established ecosystem  
✅ Better DeFi integration  
✅ More auditing tools  
✅ MetaMask ubiquitous  
✅ More institutional adoption  

### Trade-offs
⚠️ Higher transaction fees on mainnet  
⚠️ Slower confirmation times  
⚠️ Higher gas costs for complex operations  
⚠️ Network congestion during peak times  

## Testing the Migration

### 1. Start Local Blockchain
```bash
# Old: solana-test-validator
# New:
npx hardhat node
```

### 2. Deploy Contracts
```bash
# Old: anchor build && anchor deploy
# New:
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Connect Wallet
```bash
# Old: Phantom wallet + Solana localhost
# New: MetaMask + Ethereum localhost (Chain ID 1337)
```

### 4. Run Application
```bash
# Same as before
cd backend && npm run dev
cd frontend && npm run dev
```

## Deployment Checklist

- [ ] Install dependencies: `npm install` in root, backend, frontend
- [ ] Start Hardhat node: `npx hardhat node`
- [ ] Compile contracts: `npx hardhat compile`
- [ ] Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
- [ ] Copy `PLATFORM_ADDRESS` to `.env` files
- [ ] Setup PostgreSQL database
- [ ] Run migrations: `cd backend && npm run migrate`
- [ ] Install MetaMask browser extension
- [ ] Configure MetaMask for localhost (Chain ID 1337)
- [ ] Import test account from Hardhat node
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Connect MetaMask to application
- [ ] Test basic functionality

## Troubleshooting

### Issue: "Cannot find module '@solana/web3.js'"
**Solution:** Run `npm install` to update dependencies to Ethereum libraries.

### Issue: "VITE_PROGRAM_ID is not defined"
**Solution:** Update to `VITE_PLATFORM_ADDRESS` in `.env` files.

### Issue: "Chain ID mismatch"
**Solution:** Ensure MetaMask and `.env` both have `CHAIN_ID=1337` for localhost.

### Issue: "nonce too high"
**Solution:** Reset MetaMask account or restart Hardhat node.

## Next Steps

1. **Test all features** - Verify merchant registration, point minting, purchases work
2. **Update UI components** - Replace any Solana-specific UI elements
3. **Deploy to Sepolia** - Test on public testnet before mainnet
4. **Security audit** - Have contracts audited before mainnet deployment
5. **Gas optimization** - Optimize contracts for lower gas costs
6. **Documentation** - Update API docs and user guides

## Support

For issues:
- Check Hardhat docs: https://hardhat.org
- Check ethers.js docs: https://docs.ethers.org
- Check wagmi docs: https://wagmi.sh
- Ethereum Stack Exchange: https://ethereum.stackexchange.com
