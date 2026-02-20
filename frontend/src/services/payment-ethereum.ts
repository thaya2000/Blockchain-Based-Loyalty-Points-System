import { BrowserProvider, Contract } from 'ethers';
import { getPlatformContract, getTokenContract, hashProductId, calculateMintFee } from './ethereum';
import { ethers } from 'ethers';

export interface PurchaseWithETHParams {
  wallet: any;
  merchantWallet: string;
  productId: string;
  priceETH: string;
  loyaltyPointsReward: string;
}

export interface PurchaseWithPointsParams {
  wallet: any;
  merchantWallet: string;
  productId: string;
  pointsAmount: string;
}

export interface MintPointsParams {
  wallet: any;
  consumerWallet: string;
  amount: string;
  purchaseReference: string;
}

export interface RedeemPointsParams {
  wallet: any;
  merchantWallet: string;
  amount: string;
  rewardId: string;
}

/**
 * Purchase product with ETH and earn loyalty points
 */
export async function purchaseProductWithETH(params: PurchaseWithETHParams): Promise<string> {
  const { wallet, merchantWallet, productId, priceETH, loyaltyPointsReward } = params;

  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    // Hash product ID
    const productIdHash = hashProductId(productId);
    
    // Convert values
    const priceWei = ethers.parseEther(priceETH);
    const pointsWei = ethers.parseEther(loyaltyPointsReward);

    // Execute transaction
    const tx = await platform.purchaseProductWithETH(
      merchantWallet,
      productIdHash,
      pointsWei,
      { value: priceWei }
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error purchasing with ETH:', error);
    throw new Error(error.message || 'Failed to purchase product with ETH');
  }
}

/**
 * Purchase product with loyalty points
 */
export async function purchaseProductWithPoints(params: PurchaseWithPointsParams): Promise<string> {
  const { wallet, merchantWallet, productId, pointsAmount } = params;

  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    // Hash product ID
    const productIdHash = hashProductId(productId);
    
    // Convert points to wei
    const pointsWei = ethers.parseEther(pointsAmount);

    // Execute transaction
    const tx = await platform.purchaseProductWithPoints(
      merchantWallet,
      productIdHash,
      pointsWei
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error purchasing with points:', error);
    throw new Error(error.message || 'Failed to purchase product with points');
  }
}

/**
 * Mint loyalty points to a consumer (merchant only)
 */
export async function mintPointsToConsumer(params: MintPointsParams): Promise<string> {
  const { wallet, consumerWallet, amount, purchaseReference } = params;

  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    // Calculate required fee
    const fee = await calculateMintFee(amount);
    const feeWei = ethers.parseEther(fee);
    
    // Convert points to wei
    const amountWei = ethers.parseEther(amount);

    // Execute transaction
    const tx = await platform.mintPoints(
      consumerWallet,
      amountWei,
      purchaseReference,
      { value: feeWei }
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error minting points:', error);
    throw new Error(error.message || 'Failed to mint loyalty points');
  }
}

/**
 * Redeem loyalty points at a merchant
 */
export async function redeemPoints(params: RedeemPointsParams): Promise<string> {
  const { wallet, merchantWallet, amount, rewardId } = params;

  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    // Convert points to wei
    const amountWei = ethers.parseEther(amount);

    // Execute transaction
    const tx = await platform.redeemPoints(
      merchantWallet,
      amountWei,
      rewardId
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error redeeming points:', error);
    throw new Error(error.message || 'Failed to redeem points');
  }
}

/**
 * Merchant deposits ETH to receive loyalty points
 */
export async function depositETH(wallet: any, amountETH: string): Promise<string> {
  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    const amountWei = ethers.parseEther(amountETH);

    const tx = await platform.depositETH({ value: amountWei });

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error depositing ETH:', error);
    throw new Error(error.message || 'Failed to deposit ETH');
  }
}

/**
 * Register a new merchant (admin only)
 */
export async function registerMerchant(
  wallet: any,
  merchantAddress: string,
  mintAllowance: string
): Promise<string> {
  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    const allowanceWei = ethers.parseEther(mintAllowance);

    const tx = await platform.registerMerchant(merchantAddress, allowanceWei);

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error registering merchant:', error);
    throw new Error(error.message || 'Failed to register merchant');
  }
}

/**
 * Revoke merchant authorization (admin only)
 */
export async function revokeMerchant(wallet: any, merchantAddress: string): Promise<string> {
  try {
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const platform = await getPlatformContract(signer);

    const tx = await platform.revokeMerchant(merchantAddress);

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('Error revoking merchant:', error);
    throw new Error(error.message || 'Failed to revoke merchant');
  }
}

/**
 * Listen to platform events
 */
export async function subscribeToEvents(
  eventName: string,
  callback: (...args: any[]) => void
): Promise<void> {
  try {
    const platform = await getPlatformContract();
    platform.on(eventName, callback);
  } catch (error) {
    console.error(`Error subscribing to ${eventName}:`, error);
  }
}

/**
 * Unsubscribe from platform events
 */
export async function unsubscribeFromEvents(eventName: string): Promise<void> {
  try {
    const platform = await getPlatformContract();
    platform.removeAllListeners(eventName);
  } catch (error) {
    console.error(`Error unsubscribing from ${eventName}:`, error);
  }
}
