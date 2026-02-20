// Platform constants for Ethereum
export const PLATFORM_ADDRESS = process.env.PLATFORM_ADDRESS || '';
export const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';

// Ethereum RPC endpoints
export const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
export const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1337');

// Network configurations
export const NETWORKS = {
  LOCALHOST: {
    chainId: 1337,
    name: 'Localhost 8545',
    rpcUrl: 'http://localhost:8545',
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
  },
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
  },
};

// Token configuration
export const TOKEN_DECIMALS = 18; // ERC20 standard
export const POINTS_PER_DOLLAR = 10; // 10 points per $1 spent

// API configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
