# Purchase Flow - Smart Contract Integration

## ✅ Completed Steps

### 1. Program Deployment
- **Program ID**: `9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj`
- **Status**: Deployed successfully to local validator
- **Binary**: `/home/thaya/blockchain-loyalty/target/deploy/loyalty_program.so`

### 2. Payment Service Updated
- **File**: `frontend/src/services/payment.ts`  
- **Changes**:
  - Removed simulated transactions
  - Implemented real blockchain instructions
  - Added instruction discriminator calculation using SHA-256 hash
  - Added proper PDA derivation for all accounts

### 3. Smart Contract Functions Integrated

#### Purchase with SOL (`purchaseProductWithSOL`)
**What it does**:
1. Transfers SOL from customer to merchant
2. Calculates and charges minting fee to protocol treasury
3. Mints loyalty points to customer's token account
4. Creates purchase record PDA

**Accounts involved**:
- Customer (signer, pays SOL)
- Merchant (receives SOL payment)
- Protocol Treasury (receives fees)
- Platform State PDA
- Merchant Record PDA
- Purchase Record PDA (new)
- Token Mint PDA
- Customer Token Account
- SPL Token Program
- System Program

#### Purchase with Points (`redeemLoyaltyPoints`)
**What it does**:
1. Burns loyalty points from customer's account
2. Creates purchase record PDA
3. Updates merchant statistics

**Accounts involved**:
- Customer (signer, burns points)
- Merchant wallet
- Platform State PDA
- Merchant Record PDA
- Purchase Record PDA (new)
- Token Mint PDA
- Customer Token Account
- SPL Token Program
- System Program

## 🔧 Platform Initialization Required

Before purchases can work, the platform must be initialized:

### Option 1: Run Setup Script
```bash
cd /home/thaya/blockchain-loyalty
npx ts-node scripts/setup-platform.ts
```

This will:
- Initialize platform state with admin authority
- Create loyalty token mint
- Register initial merchant
- Set platform parameters (fees, ratios, etc.)

### Option 2: Manual Initialization
```bash
# 1. Fund the admin wallet
solana airdrop 10 CdeqKndivaNcKq36n1wC3pQ1P1reXrcgp2YJ9oAWpDB8 --url http://localhost:8899

# 2. Run the setup script
npx ts-node scripts/setup-platform.ts
```

## 🧪 Testing the Purchase Flow

### Prerequisites
1. ✅ Solana test validator running
2. ✅ Program deployed
3. ⚠️  Platform initialized (run setup-platform.ts)
4. ⚠️  Merchant registered on-chain
5. ⚠️  Customer wallet has SOL
6. ⚠️  Product exists in database

### Test Steps

1. **Start the validator** (if not running):
   ```bash
   solana-test-validator
   ```

2. **Start backend**:
   ```bash
   cd backend && npm run dev
   ```

3. **Start frontend**:
   ```bash
   cd frontend && npm run dev
   ```

4. **Connect wallet** (Phantom/Solflare)
   - Ensure connected to localhost (Settings → Change Network → Custom RPC: http://localhost:8899)

5. **Fund your wallet**:
   ```bash
   solana airdrop 5 <YOUR_WALLET_ADDRESS> --url http://localhost:8899
   ```

6. **Create a product** (as merchant)
   - Go to Merchant Dashboard
   - Create a new product
   - Set price (e.g., 0.01 SOL)
   - Loyalty points will auto-calculate based on price

7. **Purchase the product** (as consumer)
   - Go to Marketplace
   - Click "Buy Now" on a product
   - Select payment method (SOL or Loyalty Points)
   - Approve the transaction in your wallet

### Expected Results

**When paying with SOL**:
- ✅ Transaction broadcasts to blockchain
- ✅ SOL transfers from customer to merchant
- ✅ Minting fee transfers to protocol treasury
- ✅ Loyalty points mint to customer's token account
- ✅ Purchase record created on-chain
- ✅ Order updated in database with real tx signature

**When paying with Loyalty Points**:
- ✅ Transaction broadcasts to blockchain
- ✅ Points burn from customer's account
- ✅ Purchase record created on-chain
- ✅ Order updated in database with real tx signature

### Monitoring Transactions

**View transaction logs**:
```bash
solana logs --url http://localhost:8899
```

**Check account balances**:
```bash
# Check SOL balance
solana balance <WALLET_ADDRESS> --url http://localhost:8899

# Check loyalty token account (requires token account address)
spl-token accounts --url http://localhost:8899
```

## 🐛 Troubleshooting

### "Platform not initialized" error
- Run `npx ts-node scripts/setup-platform.ts`

### "Merchant not registered" error
- The merchant must be registered on-chain (setup script does this for initial merchant)
- For additional merchants, admin needs to call `register_merchant` instruction

### "Insufficient loyalty points" error
- Customer needs to purchase with SOL first to earn points
- Or merchant needs to issue points manually

### Transaction fails silently
- Check validator logs: `solana logs --url http://localhost:8899`
- Verify all accounts are correctly derived
- Ensure platform is initialized and merchant is registered

### "Account not found" errors
- Customer token account is created automatically on first purchase
- Ensure customer wallet has enough SOL for rent + transaction fees

## 📊 Verification Checklist

Before testing purchases:

- [ ] Solana test validator is running
- [ ] Program deployed: `9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj`
- [ ] Platform initialized (`npx ts-node scripts/setup-platform.ts`)
- [ ] Admin wallet funded: `CdeqKndivaNcKq36n1wC3pQ1P1reXrcgp2YJ9oAWpDB8`
- [ ] Merchant approved in database
- [ ] Merchant registered on-chain
- [ ] Test wallet has SOL
- [ ] Backend API running
- [ ] Frontend running
- [ ] Wallet connected to localhost

## 🎯 Next Steps

1. Run platform initialization: `npx ts-node scripts/setup-platform.ts`
2. Start your test validator, backend, and frontend
3. Test a purchase with SOL payment
4. Verify transaction on Solana Explorer (localhost)
5. Check loyalty points were minted
6. Test a purchase with loyalty points payment
7. Verify points were burned

All smart contract integrations are now **ready for testing**! 🚀
