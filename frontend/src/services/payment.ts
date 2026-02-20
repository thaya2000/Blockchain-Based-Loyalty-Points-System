import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Token decimals - must match the value passed to initialize_platform (6)
const TOKEN_DECIMALS = 6;
const LP_SCALE = BigInt(10 ** TOKEN_DECIMALS); // 1_000_000

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

function derivePurchaseRecordPDA(customerWallet: PublicKey, productIdHash: Buffer, nonce: bigint): [PublicKey, number] {
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(nonce, 0);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('purchase'),
      customerWallet.toBuffer(),
      productIdHash,
      nonceBuffer,
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

// Calculate Anchor instruction discriminator
async function getInstructionDiscriminator(instructionName: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${instructionName}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return Buffer.from(hashBuffer).slice(0, 8);
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
 * Calls the deposit_sol instruction on-chain.
 */
export async function depositSol(params: DepositSolParams): Promise<string> {
  const { connection, wallet, solAmount } = params;

  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const programId = getProgramId();
  const [platformState] = derivePlatformStatePDA();
  const [tokenMint] = deriveTokenMintPDA();
  const merchantPubkey = wallet.publicKey;
  const [merchantRecord] = deriveMerchantRecordPDA(merchantPubkey);
  const protocolTreasury = getPlatformAuthority();
  const { ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

  const merchantTokenAccount = await getAssociatedTokenAddress(tokenMint, merchantPubkey);

  const discriminator = await getInstructionDiscriminator('deposit_sol');
  const argsBuffer = Buffer.alloc(8);
  argsBuffer.writeBigUInt64LE(BigInt(solAmount), 0);
  const data = Buffer.concat([discriminator, argsBuffer]);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: merchantPubkey, isSigner: true, isWritable: true },
      { pubkey: protocolTreasury, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: true },
      { pubkey: merchantRecord, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = merchantPubkey;

  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

  console.log('Deposit SOL confirmed:', { merchant: merchantPubkey.toBase58(), solAmount, signature });
  return signature;
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

    // Create product ID hash and derive purchase record PDA with unique nonce
    const productIdHash = await hashProductId(productId);
    const nonce = BigInt(Date.now()); // unique per purchase attempt
    const [purchaseRecord] = derivePurchaseRecordPDA(wallet.publicKey, productIdHash, nonce);

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

    // Build purchase_product_with_sol instruction
    // Data layout: [8 discriminator][32 product_id_hash][8 price_sol][8 loyalty_points_reward][8 nonce]
    const discriminator = await getInstructionDiscriminator('purchase_product_with_sol');
    const instructionData = Buffer.alloc(8 + 32 + 8 + 8 + 8);
    let offset = 0;
    
    // Instruction discriminator
    discriminator.copy(instructionData, offset);
    offset += 8;
    
    // product_id_hash: [u8; 32]
    productIdHash.copy(instructionData, offset);
    offset += 32;
    
    // price_sol: u64 (little-endian)
    instructionData.writeBigUInt64LE(BigInt(priceSol), offset);
    offset += 8;
    
    // loyalty_points_reward: u64 (little-endian) — scale to raw token units
    instructionData.writeBigUInt64LE(BigInt(loyaltyPointsReward) * LP_SCALE, offset);
    offset += 8;

    // nonce: u64 (little-endian)
    instructionData.writeBigUInt64LE(nonce, offset);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: merchantPubkey, isSigner: false, isWritable: true },
        { pubkey: protocolTreasury, isSigner: false, isWritable: true },
        { pubkey: platformState, isSigner: false, isWritable: true },
        { pubkey: merchantRecord, isSigner: false, isWritable: true },
        { pubkey: purchaseRecord, isSigner: false, isWritable: true },
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: customerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: instructionData,
    });

    transaction.add(instruction);

    // Send and confirm transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signature = await wallet.sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    console.log('Purchase with SOL transaction confirmed:', {
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
 * Calls the purchase_product_with_points instruction on-chain.
 * Note: this is an alias for redeemLoyaltyPoints — use either.
 */
export async function purchaseProductWithPoints(params: PurchaseWithPointsParams): Promise<string> {
  return redeemLoyaltyPoints(params);
}

// ============================================
// Consumer: Redeem loyalty points at merchant
// ============================================

/**
 * Redeem loyalty points for a reward at a merchant
 * This calls the purchase_product_with_points instruction on-chain
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

    // Create product ID hash and derive purchase record PDA with unique nonce
    const productIdHash = await hashProductId(productId);
    const nonce = BigInt(Date.now()); // unique per redemption attempt
    const [purchaseRecord] = derivePurchaseRecordPDA(wallet.publicKey, productIdHash, nonce);

    // Build transaction
    const transaction = new Transaction();

    // Build purchase_product_with_points instruction
    // Data layout: [8 discriminator][32 product_id_hash][8 points_amount][8 nonce]
    const discriminator = await getInstructionDiscriminator('purchase_product_with_points');
    const instructionData = Buffer.alloc(8 + 32 + 8 + 8);
    let offset = 0;
    
    // Instruction discriminator
    discriminator.copy(instructionData, offset);
    offset += 8;
    
    // product_id_hash: [u8; 32]
    productIdHash.copy(instructionData, offset);
    offset += 32;
    
    // points_amount: u64 (little-endian) — scale to raw token units
    instructionData.writeBigUInt64LE(BigInt(pointsAmount) * LP_SCALE, offset);
    offset += 8;

    // nonce: u64 (little-endian)
    instructionData.writeBigUInt64LE(nonce, offset);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: merchantPubkey, isSigner: false, isWritable: true },
        { pubkey: platformState, isSigner: false, isWritable: true },
        { pubkey: merchantRecord, isSigner: false, isWritable: true },
        { pubkey: purchaseRecord, isSigner: false, isWritable: true },
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: customerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: instructionData,
    });

    transaction.add(instruction);

    // Send and confirm transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signature = await wallet.sendTransaction(transaction, connection);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    console.log('Redeem points transaction confirmed:', {
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
 * Get customer's loyalty point balance from their on-chain token account
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

    const tokenBalance = await connection.getTokenAccountBalance(customerTokenAccount);
    return Number(tokenBalance.value.amount); // raw amount (unscaled)
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
