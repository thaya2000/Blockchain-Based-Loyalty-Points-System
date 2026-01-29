# Blockchain Loyalty Platform - System Workflow & Functionality

## 🏗️ System Architecture Overview

The system consists of three main layers:

1. **Blockchain Layer (Solana)** - On-chain smart contract for token operations
2. **Backend Layer (Node.js/Express)** - Off-chain metadata and business logic
3. **Frontend Layer (React)** - User interface for consumers and merchants

---

## 🔐 Core Components

### 1. **Solana Smart Contract (Program)**
**Location**: `programs/loyalty_program/src/`

**Key Functions**:
- `initialize_platform()` - Setup the loyalty token system with admin authority
- `register_merchant()` - Authorize a merchant to mint points (admin only)
- `revoke_merchant()` - Revoke merchant authorization (admin only)
- `mint_points()` - Issue loyalty points to consumers (merchant only)
- `redeem_points()` - Burn points when consumer redeems rewards (consumer)

**On-Chain State**:
- **PlatformState**: Stores admin, token mint address, total supply
- **MerchantRecord**: Tracks authorized merchants, mint allowance, points issued
- **Loyalty Token Mint**: SPL token representing loyalty points

---

### 2. **Backend API Server**
**Location**: `backend/src/`

**Core Services**:

#### **Loyalty Service** (`services/loyalty.service.ts`)
Manages off-chain business logic and database operations:
- User profile management
- Merchant metadata (business name, category, logo)
- Rewards catalog
- Transaction logging

#### **Solana Service** (`services/solana.service.ts`)
Handles blockchain interactions:
- Check merchant authorization status
- Get user token balance
- Query on-chain data
- Generate PDAs (Program Derived Addresses)

#### **API Endpoints**:

**Merchants** (`/api/merchants`):
- `GET /` - List all active merchants
- `GET /:wallet` - Get merchant details
- `POST /` - Register new merchant (off-chain)
- `PATCH /:wallet` - Update merchant metadata
- `GET /:wallet/rewards` - Get merchant's rewards catalog

**Users** (`/api/users`):
- `GET /:wallet` - Get user profile
- `POST /` - Create user profile
- `GET /:wallet/balance` - Get loyalty points balance
- `GET /:wallet/transactions` - Get transaction history

**Rewards** (`/api/rewards`):
- `GET /` - List all available rewards
- `GET /:id` - Get reward details
- `POST /` - Create new reward (merchant)
- `PATCH /:id` - Update reward
- `DELETE /:id` - Delete reward

**Transactions** (`/api/transactions`):
- `POST /log` - Log transaction to database
- `GET /` - Query transaction history

---

### 3. **Frontend Application**
**Location**: `frontend/src/`

**Pages**:

#### **HomePage** (`pages/HomePage.tsx`)
- Landing page explaining the platform
- Connect wallet button
- Platform statistics

#### **Consumer Dashboard** (`pages/ConsumerDashboard.tsx`)
- View loyalty points balance
- View SOL balance
- Transaction history
- Statistics (times earned, redemptions, merchants visited)

#### **Merchant Dashboard** (`pages/MerchantDashboard.tsx`)
- Merchant profile management
- Mint loyalty points to customers
- View issued points statistics
- Manage rewards catalog

#### **Rewards Page** (`pages/RewardsPage.tsx`)
- Browse available rewards from all merchants
- Filter by merchant or category
- Redeem rewards using points

**Key Components**:
- `BalanceDisplay` - Shows loyalty points and SOL balance
- `TransactionList` - Displays transaction history
- `RewardCard` - Reward item display
- `Navbar` - Navigation with wallet connect

---

## 🔄 Complete Workflow

### **Phase 1: Platform Initialization** (Admin)

```
Admin Wallet
    ↓
1. Deploy Solana program
2. Call initialize_platform()
    ↓
Creates:
    - Platform State PDA
    - Loyalty Token Mint (SPL Token)
    - Admin authority
```

### **Phase 2: Merchant Registration**

#### **Off-Chain Registration** (Business Metadata):
```
Merchant
    ↓
Frontend: Merchant Dashboard → Register
    ↓
POST /api/merchants
    {
        walletAddress,
        businessName,
        category,
        logoUrl
    }
    ↓
Database: merchants table
    ↓
Success: Merchant profile created
```

#### **On-Chain Authorization** (Admin Required):
```
Admin Wallet
    ↓
Call register_merchant() on Solana
    {
        merchant_wallet,
        mint_allowance (max points merchant can issue)
    }
    ↓
Creates: MerchantRecord PDA
    ↓
Merchant is now authorized to mint points
```

### **Phase 3: Consumer Onboarding**

```
Consumer
    ↓
1. Connect Solana wallet (Phantom/Solflare/Backpack)
2. Frontend auto-creates user profile
    ↓
POST /api/users
    {
        walletAddress,
        displayName
    }
    ↓
Database: users table
    ↓
Consumer Dashboard displays 0 points initially
```

### **Phase 4: Earning Points** (Core Flow)

```
SCENARIO: Customer makes $100 purchase at Coffee Shop

Merchant Dashboard:
    ↓
1. Merchant enters:
    - Customer wallet address
    - Points amount (e.g., 100 points for $100)
    - Purchase reference (invoice #)
    ↓
2. Frontend calls Solana program: mint_points()
    ↓
3. Smart Contract validates:
    ✓ Merchant is authorized
    ✓ Merchant has mint allowance
    ✓ Consumer token account exists (creates if not)
    ↓
4. SPL Token Mint:
    - Mint loyalty tokens to consumer
    - Update merchant's issued count
    - Deduct from merchant's allowance
    ↓
5. Frontend logs transaction:
    POST /api/transactions/log
    {
        txSignature,
        txType: 'mint',
        userWallet,
        merchantWallet,
        pointsAmount,
        purchaseReference
    }
    ↓
6. Database: transaction_log table
    ↓
✅ Consumer now has 100 loyalty points in wallet
```

**Flow Diagram**:
```
Customer Purchase → Merchant Dashboard → Solana Program
                                              ↓
                                      Mint SPL Tokens
                                              ↓
                                    Consumer Wallet (+100 PTS)
                                              ↓
                                      Log to Database
                                              ↓
                                    Consumer Dashboard Updated
```

### **Phase 5: Creating Rewards** (Merchant)

```
Merchant Dashboard → Rewards Section
    ↓
POST /api/rewards
    {
        merchantId,
        name: "Free Coffee",
        description: "Redeem for one free coffee",
        pointsCost: 50,
        imageUrl,
        quantityAvailable: 100
    }
    ↓
Database: rewards table
    ↓
Reward appears in marketplace
```

### **Phase 6: Redeeming Rewards** (Consumer)

```
SCENARIO: Consumer redeems "Free Coffee" (50 points)

Consumer:
    ↓
1. Browse Rewards Page
2. Select "Free Coffee" reward
3. Click "Redeem"
    ↓
4. Frontend calls Solana program: redeem_points()
    {
        amount: 50,
        reward_id: "uuid"
    }
    ↓
5. Smart Contract:
    ✓ Consumer has sufficient balance
    ✓ Burn 50 tokens from consumer wallet
    ✓ Update merchant's redeemed count
    ↓
6. Frontend logs transaction:
    POST /api/transactions/log
    {
        txSignature,
        txType: 'redeem',
        userWallet,
        merchantWallet,
        pointsAmount: 50,
        rewardId
    }
    ↓
7. Database updates:
    - transaction_log
    - rewards.quantity_available (-1)
    ↓
✅ Consumer balance: 100 - 50 = 50 points
✅ Merchant provides free coffee
```

**Flow Diagram**:
```
Consumer selects reward → redeem_points() → Burn SPL Tokens
                                                  ↓
                                    Consumer Wallet (-50 PTS)
                                                  ↓
                                          Log Transaction
                                                  ↓
                                    Merchant fulfills reward
```

---

## 📊 Data Flow

### **Balance Checking Flow**:
```
Consumer Dashboard → GET /api/users/:wallet/balance
                            ↓
                    Solana Service queries blockchain
                            ↓
                    getBalance() → Token Account
                            ↓
                    Returns balance in tokens
                            ↓
                    Display on dashboard
```

### **Transaction History Flow**:
```
Consumer Dashboard → GET /api/users/:wallet/transactions
                            ↓
                    Query database: transaction_log
                            ↓
                    Filter by user_wallet
                            ↓
                    Return sorted by created_at DESC
                            ↓
                    Display in TransactionList component
```

---

## 🔑 Key Features Implemented

### ✅ **1. Multi-Merchant Support**
- Any merchant can be registered and authorized
- Merchants are independent but share same loyalty token
- Points earned at any merchant can be redeemed anywhere

### ✅ **2. Wallet-Based Authentication**
- No passwords - uses Solana wallet signatures
- Consumer owns their tokens directly
- Non-custodial - platform cannot take tokens

### ✅ **3. On-Chain Verification**
- All point minting/burning is on blockchain
- Transparent and auditable
- Merchant authorization checked on-chain

### ✅ **4. Off-Chain Metadata**
- Business information stored in PostgreSQL
- Reward catalogs managed off-chain
- Transaction context and references logged

### ✅ **5. Real-Time Balance Updates**
- Frontend polls blockchain for current balance
- Automatic refresh every 30 seconds
- Manual refresh button available

### ✅ **6. SPL Token Standard**
- Uses Solana's SPL Token program
- Compatible with any Solana wallet
- Can be transferred between users (if enabled)

---

## 🔒 Security & Access Control

### **Role-Based Permissions**:

**Admin**:
- Initialize platform
- Register merchants on-chain
- Revoke merchant authorization
- Set mint allowances

**Merchant**:
- Mint points to consumers (within allowance)
- Create/manage rewards
- View issued points statistics

**Consumer**:
- Redeem points for rewards
- View balance and history
- Transfer points (if enabled)

### **On-Chain Validation**:
- Merchant must be authorized to mint
- Consumer must have sufficient balance to redeem
- All transactions signed by wallet owner

---

## 🚀 User Journeys

### **Consumer Journey**:
1. Connect wallet → Dashboard shows 0 points
2. Make purchase at merchant → Merchant mints points
3. Receive notification → Balance updates
4. Browse rewards → Select reward
5. Redeem points → Points burned, reward received
6. View history → See all transactions

### **Merchant Journey**:
1. Register business (off-chain)
2. Admin authorizes (on-chain)
3. Customer makes purchase
4. Merchant mints points to customer wallet
5. Create rewards in catalog
6. Customer redeems reward
7. Fulfill reward to customer
8. View analytics and statistics

---

## 📈 Future Enhancement Possibilities

### Not Yet Implemented:
- Point transfers between consumers
- Point expiry/vesting schedules
- Tiered membership levels
- Referral bonuses
- Merchant analytics dashboard
- Push notifications for point earnings
- QR code scanning for point issuance
- Mobile app integration
- Multi-token support (different point types)

---

## 🎯 Current System Limitations

1. **Admin Dependency**: Merchants need admin to authorize them on-chain
2. **No Automatic Point Issuance**: Manual entry by merchant required
3. **No POS Integration**: Standalone system, not integrated with payment systems
4. **Single Token Type**: All merchants use same loyalty token
5. **No Point Expiration**: Points never expire once issued

---

## 💡 Summary

**The system enables:**
- Merchants to issue loyalty points as blockchain tokens
- Consumers to earn and redeem points across multiple merchants
- Transparent, auditable loyalty program on public blockchain
- Non-custodial consumer ownership of points
- Flexible reward marketplace

**Technology Stack:**
- Blockchain: Solana + Anchor Framework
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + Vite + Wallet Adapters
- Token Standard: SPL Token

This creates a decentralized loyalty ecosystem where points have real ownership and portability! 🎊
