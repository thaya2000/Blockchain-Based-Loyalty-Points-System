import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { SOLANA_RPC_URL, PROGRAM_ID, LOYALTY_MINT_SEED, PLATFORM_STATE_SEED, MERCHANT_SEED } from '../../../shared/constants.js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    this.programId = new PublicKey(PROGRAM_ID);
  }

  // ============================================
  // Read Operations
  // ============================================

  /**
   * Get the platform state PDA
   */
  getPlatformStatePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PLATFORM_STATE_SEED)],
      this.programId
    );
  }

  /**
   * Get the loyalty token mint PDA
   */
  getLoyaltyMintPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(LOYALTY_MINT_SEED)],
      this.programId
    );
  }

  /**
   * Get a merchant record PDA
   */
  getMerchantPDA(merchantWallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(MERCHANT_SEED), merchantWallet.toBuffer()],
      this.programId
    );
  }

  /**
   * Get loyalty token balance for a wallet
   */
  async getBalance(walletAddress: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress);
      const [mintPDA] = this.getLoyaltyMintPDA();

      const ata = await getAssociatedTokenAddress(mintPDA, wallet);
      const account = await getAccount(this.connection, ata);

      return Number(account.amount);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Check if a merchant is authorized on-chain
   */
  async isMerchantAuthorized(merchantWallet: string): Promise<boolean> {
    try {
      const merchant = new PublicKey(merchantWallet);
      const [merchantPDA] = this.getMerchantPDA(merchant);

      const accountInfo = await this.connection.getAccountInfo(merchantPDA);
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
   * Get transaction details
   */
  async getTransaction(signature: string) {
    return this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(walletAddress: string, limit: number = 20) {
    const wallet = new PublicKey(walletAddress);
    const signatures = await this.connection.getSignaturesForAddress(wallet, {
      limit,
    });
    return signatures;
  }

  // ============================================
  // Write Operations (Transaction Building)
  // ============================================

  /**
   * Get the current blockhash for transaction building
   */
  async getRecentBlockhash() {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    return { blockhash, lastValidBlockHeight };
  }

  /**
   * Send and confirm a transaction
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } = await this.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    if (signers.length > 0) {
      transaction.sign(...signers);
    }

    const signature = await this.connection.sendRawTransaction(
      transaction.serialize()
    );

    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return signature;
  }

  /**
   * Get connection instance for direct access
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Register a merchant on-chain by calling the register_merchant instruction.
   * Loads admin keypair from ADMIN_KEYPAIR_PATH env var or ~/.config/solana/id.json.
   * Default mint allowance: 100M LP (with 6 decimals).
   */
  async registerMerchantOnChain(
    merchantWallet: string,
    mintAllowance: bigint = BigInt(100_000_000) * BigInt(10 ** 6)
  ): Promise<string> {
    // Load admin keypair
    const keypairPath =
      process.env.ADMIN_KEYPAIR_PATH ||
      path.join(os.homedir(), '.config/solana/id.json');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

    // Derive PDAs
    const [platformStatePDA] = this.getPlatformStatePDA();
    const merchant = new PublicKey(merchantWallet);
    const [merchantRecordPDA] = this.getMerchantPDA(merchant);

    // Anchor discriminator: sha256("global:register_merchant")[0..8]
    const disc = crypto
      .createHash('sha256')
      .update('global:register_merchant')
      .digest()
      .subarray(0, 8);

    // Args: mint_allowance as u64 LE
    const args = Buffer.alloc(8);
    args.writeBigUInt64LE(mintAllowance, 0);

    const data = Buffer.concat([disc, args]);

    const ix = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true,  isWritable: true  },
        { pubkey: platformStatePDA,       isSigner: false, isWritable: true  },
        { pubkey: merchant,               isSigner: false, isWritable: false },
        { pubkey: merchantRecordPDA,      isSigner: false, isWritable: true  },
        { pubkey: SystemProgram.programId,isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    return this.sendTransaction(tx, [adminKeypair]);
  }
}

export const solanaService = new SolanaService();
