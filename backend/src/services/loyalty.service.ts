import pool from '../db/index.js';
import { solanaService } from './solana.service.js';
import type { User, Merchant, Reward, TransactionLog } from '../../../shared/types.js';

export class LoyaltyService {
  // ============================================
  // User Operations
  // ============================================

  async createUser(walletAddress: string, displayName?: string, email?: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (wallet_address, display_name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_address) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         email = COALESCE(EXCLUDED.email, users.email)
       RETURNING *`,
      [walletAddress, displayName, email]
    );
    return this.mapUser(result.rows[0]);
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserBalance(walletAddress: string): Promise<number> {
    return solanaService.getBalance(walletAddress);
  }

  // ============================================
  // Merchant Operations
  // ============================================

  async createMerchant(
    walletAddress: string,
    businessName: string,
    category?: string,
    logoUrl?: string
  ): Promise<Merchant> {
    const result = await pool.query(
      `INSERT INTO merchants (wallet_address, business_name, category, logo_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [walletAddress, businessName, category, logoUrl]
    );
    return this.mapMerchant(result.rows[0]);
  }

  async getMerchantByWallet(walletAddress: string): Promise<Merchant | null> {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] ? this.mapMerchant(result.rows[0]) : null;
  }

  async getAllMerchants(activeOnly: boolean = true): Promise<Merchant[]> {
    const query = activeOnly
      ? 'SELECT * FROM merchants WHERE is_active = true ORDER BY business_name'
      : 'SELECT * FROM merchants ORDER BY business_name';
    const result = await pool.query(query);
    return result.rows.map(this.mapMerchant);
  }

  async getMerchantsByCategory(category: string): Promise<Merchant[]> {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE category = $1 AND is_active = true ORDER BY business_name',
      [category]
    );
    return result.rows.map(this.mapMerchant);
  }

  async updateMerchant(
    walletAddress: string,
    updates: Partial<Omit<Merchant, 'id' | 'walletAddress' | 'registeredAt'>>
  ): Promise<Merchant | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.businessName !== undefined) {
      fields.push(`business_name = $${paramIndex++}`);
      values.push(updates.businessName);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.logoUrl !== undefined) {
      fields.push(`logo_url = $${paramIndex++}`);
      values.push(updates.logoUrl);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (fields.length === 0) return null;

    values.push(walletAddress);
    const result = await pool.query(
      `UPDATE merchants SET ${fields.join(', ')} WHERE wallet_address = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapMerchant(result.rows[0]) : null;
  }

  // ============================================
  // Reward Operations
  // ============================================

  async createReward(
    merchantId: string,
    name: string,
    pointsCost: number,
    description?: string,
    imageUrl?: string
  ): Promise<Reward> {
    const result = await pool.query(
      `INSERT INTO rewards (merchant_id, name, points_cost, description, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [merchantId, name, pointsCost, description, imageUrl]
    );
    return this.mapReward(result.rows[0]);
  }

  async getRewardById(rewardId: string): Promise<Reward | null> {
    const result = await pool.query('SELECT * FROM rewards WHERE id = $1', [rewardId]);
    return result.rows[0] ? this.mapReward(result.rows[0]) : null;
  }

  async getRewardsByMerchant(merchantId: string): Promise<Reward[]> {
    const result = await pool.query(
      'SELECT * FROM rewards WHERE merchant_id = $1 AND is_available = true ORDER BY points_cost',
      [merchantId]
    );
    return result.rows.map(this.mapReward);
  }

  async getAllAvailableRewards(): Promise<Reward[]> {
    const result = await pool.query(
      `SELECT r.* FROM rewards r
       JOIN merchants m ON r.merchant_id = m.id
       WHERE r.is_available = true AND m.is_active = true
       ORDER BY r.points_cost`
    );
    return result.rows.map(this.mapReward);
  }

  async updateReward(
    rewardId: string,
    updates: Partial<Omit<Reward, 'id' | 'merchantId'>>
  ): Promise<Reward | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.pointsCost !== undefined) {
      fields.push(`points_cost = $${paramIndex++}`);
      values.push(updates.pointsCost);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.imageUrl !== undefined) {
      fields.push(`image_url = $${paramIndex++}`);
      values.push(updates.imageUrl);
    }
    if (updates.isAvailable !== undefined) {
      fields.push(`is_available = $${paramIndex++}`);
      values.push(updates.isAvailable);
    }

    if (fields.length === 0) return null;

    values.push(rewardId);
    const result = await pool.query(
      `UPDATE rewards SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapReward(result.rows[0]) : null;
  }

  // ============================================
  // Transaction Logging
  // ============================================

  async logTransaction(
    txSignature: string,
    txType: 'mint' | 'redeem',
    userWallet: string | null,
    merchantWallet: string | null,
    pointsAmount: number,
    rewardId?: string,
    purchaseReference?: string,
    metadata?: Record<string, unknown>
  ): Promise<TransactionLog> {
    const result = await pool.query(
      `INSERT INTO transaction_log 
       (tx_signature, tx_type, user_wallet, merchant_wallet, points_amount, reward_id, purchase_reference, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        txSignature,
        txType,
        userWallet,
        merchantWallet,
        pointsAmount,
        rewardId,
        purchaseReference,
        JSON.stringify(metadata || {}),
      ]
    );
    return this.mapTransactionLog(result.rows[0]);
  }

  async getTransactionsByUser(userWallet: string, limit: number = 50): Promise<TransactionLog[]> {
    const result = await pool.query(
      'SELECT * FROM transaction_log WHERE user_wallet = $1 ORDER BY created_at DESC LIMIT $2',
      [userWallet, limit]
    );
    return result.rows.map(this.mapTransactionLog);
  }

  async getTransactionsByMerchant(merchantWallet: string, limit: number = 50): Promise<TransactionLog[]> {
    const result = await pool.query(
      'SELECT * FROM transaction_log WHERE merchant_wallet = $1 ORDER BY created_at DESC LIMIT $2',
      [merchantWallet, limit]
    );
    return result.rows.map(this.mapTransactionLog);
  }

  // ============================================
  // Mappers
  // ============================================

  private mapUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      walletAddress: row.wallet_address as string,
      displayName: row.display_name as string | undefined,
      email: row.email as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  private mapMerchant(row: Record<string, unknown>): Merchant {
    return {
      id: row.id as string,
      walletAddress: row.wallet_address as string,
      businessName: row.business_name as string,
      category: row.category as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      isActive: row.is_active as boolean,
      registeredAt: new Date(row.registered_at as string),
    };
  }

  private mapReward(row: Record<string, unknown>): Reward {
    return {
      id: row.id as string,
      merchantId: row.merchant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      pointsCost: row.points_cost as number,
      imageUrl: row.image_url as string | undefined,
      isAvailable: row.is_available as boolean,
    };
  }

  private mapTransactionLog(row: Record<string, unknown>): TransactionLog {
    return {
      id: row.id as string,
      txSignature: row.tx_signature as string,
      txType: row.tx_type as 'mint' | 'redeem',
      userWallet: row.user_wallet as string | undefined,
      merchantWallet: row.merchant_wallet as string | undefined,
      pointsAmount: Number(row.points_amount),
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}

export const loyaltyService = new LoyaltyService();
