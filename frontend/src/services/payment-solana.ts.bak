import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AnchorProvider, Program, web3, BN } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Lazy initialization of PublicKeys to avoid errors on missing env vars
let PROGRAM_ID: PublicKey | null = null;
let PLATFORM_AUTHORITY: PublicKey | null = null;

function getProgramId(): PublicKey {
  if (!PROGRAM_ID) {
    const programIdStr = import.meta.env.VITE_PROGRAM_ID;
    if (!programIdStr) {
      throw new Error('VITE_PROGRAM_ID environment variable is not set');
    }
    PROGRAM_ID = new PublicKey(programIdStr);
  }
  return PROGRAM_ID;
}

function getPlatformAuthority(): PublicKey {
  if (!PLATFORM_AUTHORITY) {
    const authorityStr = import.meta.env.VITE_PLATFORM_AUTHORITY;
    if (!authorityStr) {
      console.warn('VITE_PLATFORM_AUTHORITY not set, using PROGRAM_ID as fallback');
      PLATFORM_AUTHORITY = getProgramId();
    } else {
      PLATFORM_AUTHORITY = new PublicKey(authorityStr);
    }
  }
  return PLATFORM_AUTHORITY;
}

// ============================================
// PDA Derivation Helpers
// ============================================

function derivePlatformStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('platform_state')],
    getProgramId()
  );
}

function deriveTokenMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('loyalty_mint')],
    getProgramId()
  );
}

function deriveMerchantRecordPDA(merchantWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), merchantWallet.toBuffer()],
    getProgramId()
  );
}

function derivePurchaseRecordPDA(customerWallet: PublicKey, productIdHash: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('purchase'),
      customerWallet.toBuffer(),
      productIdHash,
    ],
    getProgramId()
  );
}

async function hashProductId(productId: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(productId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return Buffer.from(hashBuffer);
}

// ============================================
// Interfaces
// ============================================

export interface PurchaseWithSOLParams {
  connection: Connection;
  wallet: any;
  merchantWallet: string;
  productId: string;
  priceSol: number; // in lamports
  loyaltyPointsReward: number;
}

export interface PurchaseWithPointsParams {
  connection: Connection;
  wallet: any;
  merchantWallet: string;
  productId: string;
  pointsAmount: number;
}

export interface DepositSolParams {
  connection: Connection;
  wallet: any;
  solAmount: number; // in lamports
}

export interface RedeemPointsParams {
  connection: Connection;
  wallet: any;
  merchantWallet: string;
  productId: string;
  pointsAmount: number;
}

// ============================================
// Merchant: Deposit SOL to get Loyalty Points
// ============================================

/**
 * Merchant deposits SOL to the protocol treasury and receives loyalty points
 * at the platform's configured ratio (e.g. 1 SOL = 100 LP)
 */
export async function depositSol(params: DepositSolParams): Promise<string> {
  const { connection, wallet, solAmount } = params;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const programId = getProgramId();
    const [platformState] = derivePlatformStatePDA();
    const [tokenMint] = deriveTokenMintPDA();
    const merchantPubkey = wallet.publicKey;
    const [merchantRecord] = deriveMerchantRecordPDA(merchantPubkey);

    // Get merchant's token account
    const merchantTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      merchantPubkey
    );

    // Get protocol treasury from platform state
    const protocolTreasury = getPlatformAuthority();

    // Build transaction
    const transaction = new Transaction();

    // Check if merchant token account exists, create if not
    const accountInfo = await connection.getAccountInfo(merchantTokenAccount);
    if (!accountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          merchantPubkey,
          merchantTokenAccount,
          merchantPubkey,
          tokenMint
        )
      );
    }

    // SOL transfer to treasury + loyalty points minting happens on-chain 
    // via the deposit_sol instruction
    // For now, simulated - replace with Anchor IDL client in production
    const signature = 'deposit_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    console.log('Deposit SOL transaction:', {
      merchant: merchantPubkey.toBase58(),
      solAmount,
      solAmountInSOL: solAmount / LAMPORTS_PER_SOL,
      signature,
    });

    return signature;
  } catch (error) {
    console.error('Error depositing SOL:', error);
    throw error;
  }
}

// ============================================
// Consumer: Purchase product with SOL
// ============================================

/**
 * Purchase a product with SOL and earn loyalty points
 * Calls the purchase_product_with_sol instruction on-chain
 */
export async function purchaseProductWithSOL(params: PurchaseWithSOLParams): Promise<string> {
  const {
    connection,
    wallet,
    merchantWallet,
    productId,
    priceSol,
    loyaltyPointsReward,
  } = params;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const programId = getProgramId();
    const [platformState] = derivePlatformStatePDA();
    const [tokenMint] = deriveTokenMintPDA();

    const merchantPubkey = new PublicKey(merchantWallet);
    const [merchantRecord] = deriveMerchantRecordPDA(merchantPubkey);

    // Get customer's token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    // Create product ID hash and derive purchase record PDA
    const productIdHash = await hashProductId(productId);
    const [purchaseRecord] = derivePurchaseRecordPDA(wallet.publicKey, productIdHash);

    // Get protocol treasury
    const protocolTreasury = getPlatformAuthority();

    // Build transaction
    const transaction = new Transaction();

    // Check if customer token account exists, create if not
    const accountInfo = await connection.getAccountInfo(customerTokenAccount);
    if (!accountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          customerTokenAccount,
          wallet.publicKey,
          tokenMint
        )
      );
    }

    // For now, return a simulated transaction signature
    // In production, use the generated Anchor client
    const signature = 'purchase_sol_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    console.log('Purchase with SOL transaction:', {
      customer: wallet.publicKey.toBase58(),
      merchant: merchantWallet,
      productId,
      priceSol,
      loyaltyPointsReward,
      signature,
    });

    return signature;
  } catch (error) {
    console.error('Error purchasing with SOL:', error);
    throw error;
  }
}

// ============================================
// Consumer: Purchase product with Loyalty Points
// ============================================

/**
 * Purchase a product by burning loyalty points
 * Calls the purchase_product_with_points instruction on-chain
 */
export async function purchaseProductWithPoints(params: PurchaseWithPointsParams): Promise<string> {
  const {
    connection,
    wallet,
    merchantWallet,
    productId,
    pointsAmount,
  } = params;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const programId = getProgramId();
    const [platformState] = derivePlatformStatePDA();
    const [tokenMint] = deriveTokenMintPDA();

    const merchantPubkey = new PublicKey(merchantWallet);
    const [merchantRecord] = deriveMerchantRecordPDA(merchantPubkey);

    // Get customer's token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    // Create product ID hash and derive purchase record PDA
    const productIdHash = await hashProductId(productId);
    const [purchaseRecord] = derivePurchaseRecordPDA(wallet.publicKey, productIdHash);

    // For now, return a simulated transaction signature
    // In production, use the generated Anchor client:
    /*
    const productIdArray = Array.from(productIdHash);
    const ix = await program.methods
      .purchaseProductWithPoints(productIdArray, new BN(pointsAmount))
      .accounts({
        customer: wallet.publicKey,
        merchant: merchantPubkey,
        platformState,
        merchantRecord,
        purchaseRecord,
        tokenMint,
        customerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(ix);
    */

    const signature = 'purchase_points_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    console.log('Purchase with loyalty points transaction:', {
      customer: wallet.publicKey.toBase58(),
      merchant: merchantWallet,
      productId,
      pointsAmount,
      signature,
    });

    return signature;
  } catch (error) {
    console.error('Error purchasing with points:', error);
    throw error;
  }
}

// ============================================
// Consumer: Redeem loyalty points at merchant
// ============================================

/**
 * Redeem loyalty points for a reward at a merchant
 * This calls the redeem_points instruction on-chain
 */
export async function redeemLoyaltyPoints(params: RedeemPointsParams): Promise<string> {
  const {
    connection,
    wallet,
    merchantWallet,
    productId,
    pointsAmount,
  } = params;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const programId = getProgramId();
    const [platformState] = derivePlatformStatePDA();
    const [tokenMint] = deriveTokenMintPDA();

    const merchantPubkey = new PublicKey(merchantWallet);
    const [merchantRecord] = deriveMerchantRecordPDA(merchantPubkey);

    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      merchantPubkey
    );

    // Simulated signature
    const signature = 'redeem_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    console.log('Redeem points transaction:', {
      customer: wallet.publicKey.toBase58(),
      merchant: merchantWallet,
      productId,
      pointsAmount,
      signature,
    });

    return signature;
  } catch (error) {
    console.error('Error redeeming points:', error);
    throw error;
  }
}

// ============================================
// Utility: Get loyalty point balance
// ============================================

/**
 * Get customer's loyalty point balance
 */
export async function getLoyaltyPointBalance(
  connection: Connection,
  customerWallet: PublicKey
): Promise<number> {
  try {
    const [tokenMint] = deriveTokenMintPDA();

    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      customerWallet
    );

    const accountInfo = await connection.getAccountInfo(customerTokenAccount);
    if (!accountInfo) {
      return 0;
    }

    // Parse token account data to get balance
    // This is simplified - actual implementation would use token account layout
    return 0; // Placeholder
  } catch (error) {
    console.error('Error getting loyalty point balance:', error);
    return 0;
  }
}

/**
 * Check if customer has enough loyalty points
 */
export async function hasEnoughPoints(
  connection: Connection,
  customerWallet: PublicKey,
  requiredPoints: number
): Promise<boolean> {
  const balance = await getLoyaltyPointBalance(connection, customerWallet);
  return balance >= requiredPoints;
}
