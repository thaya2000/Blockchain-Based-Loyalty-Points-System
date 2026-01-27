// ============================================
// Entity Types
// ============================================

export interface User {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  createdAt: Date;
}

export interface Merchant {
  id: string;
  walletAddress: string;
  businessName: string;
  category?: string;
  logoUrl?: string;
  isActive: boolean;
  registeredAt: Date;
}

export interface Reward {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface TransactionLog {
  id: string;
  txSignature: string;
  txType: 'mint' | 'redeem';
  userWallet?: string;
  merchantWallet?: string;
  pointsAmount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateUserRequest {
  walletAddress: string;
  displayName?: string;
  email?: string;
}

export interface CreateMerchantRequest {
  walletAddress: string;
  businessName: string;
  category?: string;
  logoUrl?: string;
}

export interface CreateRewardRequest {
  merchantId: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
}

export interface MintPointsRequest {
  merchantWallet: string;
  consumerWallet: string;
  amount: number;
  purchaseReference?: string;
}

export interface RedeemPointsRequest {
  consumerWallet: string;
  merchantWallet: string;
  amount: number;
  rewardId: string;
}

export interface BalanceResponse {
  walletAddress: string;
  balance: number;
  lastUpdated: Date;
}

// ============================================
// On-Chain State Types
// ============================================

export interface PlatformStateData {
  admin: string;
  tokenMint: string;
  maxSupply: number;
  currentSupply: number;
  tokenDecimals: number;
  merchantCount: number;
  isActive: boolean;
}

export interface MerchantRecordData {
  wallet: string;
  isAuthorized: boolean;
  mintAllowance: number;
  totalMinted: number;
  totalRedeemed: number;
  registeredAt: number;
}

// ============================================
// Event Types (from on-chain program)
// ============================================

export interface PointsIssuedEvent {
  merchant: string;
  consumer: string;
  amount: number;
  purchaseReference: string;
  timestamp: number;
}

export interface PointsRedeemedEvent {
  consumer: string;
  merchant: string;
  amount: number;
  rewardId: string;
  timestamp: number;
}

export interface MerchantRegisteredEvent {
  merchant: string;
  mintAllowance: number;
  registeredAt: number;
}

export interface MerchantRevokedEvent {
  merchant: string;
  revokedAt: number;
}
