import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Constants
const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
);

const PLATFORM_STATE_SEED = 'platform_state';
const MERCHANT_SEED = 'merchant';
const LOYALTY_MINT_SEED = 'loyalty_mint';

/**
 * Get the platform state PDA
 */
export function getPlatformStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PLATFORM_STATE_SEED)],
    PROGRAM_ID
  );
}

/**
 * Get the loyalty token mint PDA
 */
export function getLoyaltyMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(LOYALTY_MINT_SEED)],
    PROGRAM_ID
  );
}

/**
 * Get a merchant record PDA
 */
export function getMerchantPDA(merchantWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MERCHANT_SEED), merchantWallet.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Get loyalty token balance for a wallet
 */
export async function getBalance(
  connection: Connection,
  walletAddress: PublicKey
): Promise<number> {
  try {
    const [mintPDA] = getLoyaltyMintPDA();
    const ata = await getAssociatedTokenAddress(mintPDA, walletAddress);
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch (error) {
    // Token account doesn't exist yet
    return 0;
  }
}

/**
 * Check if mint exists (platform is initialized)
 */
export async function isPlatformInitialized(connection: Connection): Promise<boolean> {
  const [mintPDA] = getLoyaltyMintPDA();
  const accountInfo = await connection.getAccountInfo(mintPDA);
  return accountInfo !== null;
}

/**
 * Check if a merchant is authorized on-chain
 */
export async function isMerchantAuthorized(
  connection: Connection,
  merchantWallet: PublicKey
): Promise<boolean> {
  try {
    const [merchantPDA] = getMerchantPDA(merchantWallet);
    const accountInfo = await connection.getAccountInfo(merchantPDA);

    if (!accountInfo) {
      return false;
    }

    // Parse the merchant record data
    // Offset 8 (discriminator) + 32 (wallet) = 40, then is_authorized is 1 byte
    const isAuthorized = accountInfo.data[40] === 1;
    return isAuthorized;
  } catch (error) {
    console.error('Error checking merchant authorization:', error);
    return false;
  }
}

/**
 * Build a mint points transaction
 * Note: The actual transaction building requires the full IDL
 * This is a placeholder that shows the structure
 */
export function buildMintPointsInstruction(
  _merchant: PublicKey,
  _consumer: PublicKey,
  _amount: number,
  _purchaseReference: string
): Transaction {
  // In a full implementation, this would use Anchor's IDL to build the instruction
  // For now, return an empty transaction as a placeholder
  const tx = new Transaction();

  // TODO: Add the actual instruction using @coral-xyz/anchor
  // const ix = await program.methods
  //   .mintPoints(new BN(amount), purchaseReference)
  //   .accounts({...})
  //   .instruction();
  // tx.add(ix);

  return tx;
}

/**
 * Build a redeem points transaction
 * Note: The actual transaction building requires the full IDL
 */
export function buildRedeemPointsInstruction(
  _consumer: PublicKey,
  _merchant: PublicKey,
  _amount: number,
  _rewardId: string
): Transaction {
  // In a full implementation, this would use Anchor's IDL to build the instruction
  const tx = new Transaction();

  // TODO: Add the actual instruction using @coral-xyz/anchor
  // const ix = await program.methods
  //   .redeemPoints(new BN(amount), rewardId)
  //   .accounts({...})
  //   .instruction();
  // tx.add(ix);

  return tx;
}

/**
 * Shorten a Solana address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Get Solana Explorer URL for an address or transaction
 */
export function getExplorerUrl(
  addressOrSignature: string,
  type: 'address' | 'tx' = 'address',
  cluster: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  const base = 'https://explorer.solana.com';
  const path = type === 'tx' ? 'tx' : 'address';
  return `${base}/${path}/${addressOrSignature}?cluster=${cluster}`;
}

export { PROGRAM_ID };
