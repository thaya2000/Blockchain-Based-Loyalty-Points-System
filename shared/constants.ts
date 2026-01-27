// Platform constants
export const PROGRAM_ID = process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

// Solana RPC endpoints
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Token configuration
export const TOKEN_DECIMALS = 6;
export const POINTS_PER_DOLLAR = 10; // 10 points per $1 spent

// PDA seeds
export const PLATFORM_STATE_SEED = 'platform_state';
export const MERCHANT_SEED = 'merchant';
export const LOYALTY_MINT_SEED = 'loyalty_mint';

// API configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
