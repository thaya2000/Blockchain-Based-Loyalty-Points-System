import { ethers, JsonRpcProvider, Contract } from 'ethers';

// Contract ABIs (simplified - will be imported from artifacts)
const LOYALTY_PLATFORM_ABI = [
  "function loyaltyToken() view returns (address)",
  "function protocolTreasury() view returns (address)",
  "function baseMintFee() view returns (uint256)",
  "function isActive() view returns (bool)",
  "function merchantCount() view returns (uint256)",
  "function totalFeesCollected() view returns (uint256)",
  "function merchants(address) view returns (bool isAuthorized, uint256 mintAllowance, uint256 totalMinted, uint256 totalRedeemed, uint256 totalFeesPaid, uint256 registeredAt)",
  "function getMerchantInfo(address merchant) view returns (tuple(bool isAuthorized, uint256 mintAllowance, uint256 totalMinted, uint256 totalRedeemed, uint256 totalFeesPaid, uint256 registeredAt))",
  "function getPlatformStats() view returns (address tokenAddress, uint256 totalSupply, uint256 maxSupply, uint256 merchantCount, uint256 totalFeesCollected, bool isActive)"
];

const LOYALTY_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

export class EthereumService {
  private provider: JsonRpcProvider;
  private platformAddress: string;
  private platformContract: Contract;

  constructor() {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    const platformAddress = process.env.PLATFORM_ADDRESS;

    if (!platformAddress) {
      throw new Error('PLATFORM_ADDRESS environment variable is required');
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.platformAddress = platformAddress;
    this.platformContract = new Contract(this.platformAddress, LOYALTY_PLATFORM_ABI, this.provider);
  }

  /**
   * Get the platform contract instance
   */
  getPlatformContract(): Contract {
    return this.platformContract;
  }

  /**
   * Get the loyalty token contract instance
   */
  async getTokenContract(): Promise<Contract> {
    const tokenAddress = await this.platformContract.loyaltyToken();
    return new Contract(tokenAddress, LOYALTY_TOKEN_ABI, this.provider);
  }

  /**
   * Get loyalty token balance for a wallet
   */
  async getBalance(walletAddress: string): Promise<string> {
    try {
      const token = await this.getTokenContract();
      const balance = await token.balanceOf(walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Check if a merchant is authorized on-chain
   */
  async isMerchantAuthorized(merchantAddress: string): Promise<boolean> {
    try {
      const merchantInfo = await this.platformContract.getMerchantInfo(merchantAddress);
      return merchantInfo.isAuthorized;
    } catch (error) {
      console.error('Error checking merchant authorization:', error);
      return false;
    }
  }

  /**
   * Get merchant information from blockchain
   */
  async getMerchantInfo(merchantAddress: string) {
    try {
      const info = await this.platformContract.getMerchantInfo(merchantAddress);
      return {
        isAuthorized: info.isAuthorized,
        mintAllowance: ethers.formatEther(info.mintAllowance),
        totalMinted: ethers.formatEther(info.totalMinted),
        totalRedeemed: ethers.formatEther(info.totalRedeemed),
        totalFeesPaid: ethers.formatEther(info.totalFeesPaid),
        registeredAt: Number(info.registeredAt),
      };
    } catch (error) {
      console.error('Error getting merchant info:', error);
      throw error;
    }
  }

  /**
   * Get platform statistics from blockchain
   */
  async getPlatformStats() {
    try {
      const stats = await this.platformContract.getPlatformStats();
      return {
        tokenAddress: stats.tokenAddress,
        totalSupply: ethers.formatEther(stats.totalSupply),
        maxSupply: ethers.formatEther(stats.maxSupply),
        merchantCount: Number(stats.merchantCount),
        totalFeesCollected: ethers.formatEther(stats.totalFeesCollected),
        isActive: stats.isActive,
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction exists on-chain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: tx?.hash,
        from: tx?.from,
        to: tx?.to,
        value: tx?.value ? ethers.formatEther(tx.value) : '0',
        blockNumber: receipt?.blockNumber,
        status: receipt?.status === 1 ? 'success' : 'failed',
        gasUsed: receipt?.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Listen to platform events
   */
  async subscribeToEvents(eventName: string, callback: (...args: any[]) => void) {
    try {
      this.platformContract.on(eventName, callback);
    } catch (error) {
      console.error(`Error subscribing to ${eventName}:`, error);
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribeFromEvents(eventName: string) {
    try {
      this.platformContract.removeAllListeners(eventName);
    } catch (error) {
      console.error(`Error unsubscribing from ${eventName}:`, error);
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get network information
   */
  async getNetwork() {
    return await this.provider.getNetwork();
  }
}

// Export singleton instance
export const ethereumService = new EthereumService();
