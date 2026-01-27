const API_BASE = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    return { success: false, error: 'Network error' };
  }
}

// ============================================
// User API
// ============================================

export interface User {
  id: string;
  walletAddress: string;
  displayName?: string;
  email?: string;
  loyaltyBalance?: number;
}

export const userApi = {
  getByWallet: (wallet: string) =>
    fetchApi<User>(`/api/users/${wallet}`),

  getBalance: (wallet: string) =>
    fetchApi<{ walletAddress: string; balance: number }>(`/api/users/${wallet}/balance`),

  getTransactions: (wallet: string, limit = 50) =>
    fetchApi<Transaction[]>(`/api/users/${wallet}/transactions?limit=${limit}`),

  create: (data: { walletAddress: string; displayName?: string; email?: string }) =>
    fetchApi<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// Merchant API
// ============================================

export interface Merchant {
  id: string;
  walletAddress: string;
  businessName: string;
  category?: string;
  logoUrl?: string;
  isActive: boolean;
  onChainAuthorized?: boolean;
}

export const merchantApi = {
  getAll: (includeInactive = false) =>
    fetchApi<Merchant[]>(`/api/merchants?includeInactive=${includeInactive}`),

  getByWallet: (wallet: string) =>
    fetchApi<Merchant>(`/api/merchants/${wallet}`),

  getByCategory: (category: string) =>
    fetchApi<Merchant[]>(`/api/merchants?category=${category}`),

  getRewards: (wallet: string) =>
    fetchApi<Reward[]>(`/api/merchants/${wallet}/rewards`),

  getTransactions: (wallet: string, limit = 50) =>
    fetchApi<Transaction[]>(`/api/merchants/${wallet}/transactions?limit=${limit}`),

  create: (data: {
    walletAddress: string;
    businessName: string;
    category?: string;
    logoUrl?: string;
  }) =>
    fetchApi<Merchant>('/api/merchants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (wallet: string, data: Partial<Merchant>) =>
    fetchApi<Merchant>(`/api/merchants/${wallet}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ============================================
// Rewards API
// ============================================

export interface Reward {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  isAvailable: boolean;
  merchantName?: string;
}

export const rewardsApi = {
  getAll: () => fetchApi<Reward[]>('/api/rewards'),

  getById: (id: string) => fetchApi<Reward>(`/api/rewards/${id}`),

  getByMerchant: (merchantId: string) =>
    fetchApi<Reward[]>(`/api/rewards?merchantId=${merchantId}`),

  getByPriceRange: (minPoints?: number, maxPoints?: number) => {
    const params = new URLSearchParams();
    if (minPoints) params.set('minPoints', minPoints.toString());
    if (maxPoints) params.set('maxPoints', maxPoints.toString());
    return fetchApi<Reward[]>(`/api/rewards?${params}`);
  },

  create: (data: {
    merchantId: string;
    name: string;
    pointsCost: number;
    description?: string;
    imageUrl?: string;
  }) =>
    fetchApi<Reward>('/api/rewards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Reward>) =>
    fetchApi<Reward>(`/api/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/rewards/${id}`, { method: 'DELETE' }),
};

// ============================================
// Transaction API
// ============================================

export interface Transaction {
  id: string;
  txSignature: string;
  txType: 'mint' | 'redeem';
  userWallet?: string;
  merchantWallet?: string;
  pointsAmount: number;
  rewardId?: string;
  purchaseReference?: string;
  createdAt: Date;
}

export const transactionApi = {
  logMint: (data: {
    txSignature: string;
    userWallet: string;
    merchantWallet: string;
    pointsAmount: number;
    purchaseReference?: string;
  }) =>
    fetchApi<Transaction>('/api/transactions/log-mint', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logRedeem: (data: {
    txSignature: string;
    userWallet: string;
    merchantWallet: string;
    pointsAmount: number;
    rewardId?: string;
  }) =>
    fetchApi<Transaction>('/api/transactions/log-redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBySignature: (signature: string) =>
    fetchApi<{ signature: string; slot?: number; blockTime?: number }>(`/api/transactions/${signature}`),
};

// ============================================
// Platform API
// ============================================

export interface PlatformInfo {
  programId: string;
  platformStatePDA: string;
  tokenMintPDA: string;
  network: string;
  rpcUrl: string;
}

export const platformApi = {
  getInfo: () => fetchApi<PlatformInfo>('/api/platform'),
};
