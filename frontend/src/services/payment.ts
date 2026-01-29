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
      // Default to the program ID as platform authority for now
      // This should be updated with the actual authority wallet
      console.warn('VITE_PLATFORM_AUTHORITY not set, using PROGRAM_ID as fallback');
      PLATFORM_AUTHORITY = getProgramId();
    } else {
      PLATFORM_AUTHORITY = new PublicKey(authorityStr);
    }
  }
  return PLATFORM_AUTHORITY;
}

export interface PurchaseWithSOLParams {
  connection: Connection;
  wallet: any;
  merchantWallet: string;
  productId: string;
  priceSol: number; // in lamports
  loyaltyPointsReward: number;
}

export interface RedeemPointsParams {
  connection: Connection;
  wallet: any;
  merchantWallet: string;
  productId: string;
  pointsAmount: number;
}

/**
 * Purchase a product with SOL
 * This calls the purchase_product_with_sol instruction on-chain
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
    // Derive PDAs
    const programId = getProgramId();
    const [platformState] = await PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      programId
    );

    const merchantPubkey = new PublicKey(merchantWallet);
    const [merchantRecord] = await PublicKey.findProgramAddress(
      [Buffer.from('merchant'), merchantPubkey.toBuffer()],
      programId
    );

    const [tokenMint] = await PublicKey.findProgramAddress(
      [Buffer.from('token_mint'), platformState.toBuffer()],
      programId
    );

    // Get customer's token account
    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    // Create purchase record PDA
    const productIdBuffer = Buffer.from(productId);
    const [purchaseRecord] = await PublicKey.findProgramAddress(
      [
        Buffer.from('purchase'),
        wallet.publicKey.toBuffer(),
        merchantPubkey.toBuffer(),
        productIdBuffer.slice(0, 32), // Use first 32 bytes of product ID
      ],
      programId
    );

    // Get protocol treasury from platform state (in real app, fetch from account data)
    const protocolTreasury = getPlatformAuthority(); // Placeholder

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

    // Add purchase instruction (pseudo-code - actual instruction building would use Anchor IDL)
    // This is a placeholder - in production, use the generated Anchor client
    /*
    const ix = await program.methods
      .purchaseProductWithSol(
        productIdBuffer,
        new BN(loyaltyPointsReward)
      )
      .accounts({
        customer: wallet.publicKey,
        merchant: merchantPubkey,
        platformState,
        merchantRecord,
        tokenMint,
        customerTokenAccount,
        purchaseRecord,
        protocolTreasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction();
    
    transaction.add(ix);
    */

    // For now, return a simulated transaction signature
    // In production, actually send the transaction
    const signature = 'simulated_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    
    console.log('Purchase transaction (simulated):', {
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

/**
 * Redeem loyalty points for a product
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
    // Derive PDAs
    const programId = getProgramId();
    const [platformState] = await PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      programId
    );

    const merchantPubkey = new PublicKey(merchantWallet);
    const [merchantRecord] = await PublicKey.findProgramAddress(
      [Buffer.from('merchant'), merchantPubkey.toBuffer()],
      programId
    );

    const [tokenMint] = await PublicKey.findProgramAddress(
      [Buffer.from('token_mint'), platformState.toBuffer()],
      programId
    );

    const customerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      merchantPubkey
    );

    // Build transaction (pseudo-code)
    const transaction = new Transaction();

    /*
    const ix = await program.methods
      .redeemPoints(
        new BN(pointsAmount),
        Buffer.from(productId)
      )
      .accounts({
        consumer: wallet.publicKey,
        merchant: merchantPubkey,
        platformState,
        merchantRecord,
        tokenMint,
        consumerTokenAccount: customerTokenAccount,
        merchantTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    
    transaction.add(ix);
    */

    // Simulated signature
    const signature = 'simulated_redeem_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    
    console.log('Redeem points transaction (simulated):', {
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

/**
 * Get customer's loyalty point balance
 */
export async function getLoyaltyPointBalance(
  connection: Connection,
  customerWallet: PublicKey
): Promise<number> {
  try {
    const programId = getProgramId();
    const [platformState] = await PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      programId
    );

    const [tokenMint] = await PublicKey.findProgramAddress(
      [Buffer.from('token_mint'), platformState.toBuffer()],
      programId
    );

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
