import { Request, Response, NextFunction } from 'express';
import pool from '../db/index.js';

/**
 * Middleware to verify admin authorization
 * Checks if the wallet address in the request header is an active admin
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Get wallet address from header
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Wallet address not provided. Please connect your wallet.',
      });
    }

    // Validate wallet address format (Solana public key is 32-44 chars)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return res.status(401).json({
        success: false,
        error: 'Invalid wallet address format',
      });
    }

    // Check if wallet is an active admin
    const result = await pool.query(
      `SELECT id, wallet_address, name, role, is_active
       FROM admins
       WHERE wallet_address = $1 AND is_active = true`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.',
        isAdmin: false,
      });
    }

    // Attach admin info to request for use in route handlers
    req.admin = {
      id: result.rows[0].id,
      walletAddress: result.rows[0].wallet_address,
      name: result.rows[0].name,
      role: result.rows[0].role,
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin authorization',
    });
  }
}

/**
 * Check if a wallet address is an admin (without blocking the request)
 * Returns admin status in the response
 */
export async function checkAdminStatus(walletAddress: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT id FROM admins WHERE wallet_address = $1 AND is_active = true`,
      [walletAddress]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Extend Express Request type to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        walletAddress: string;
        name: string;
        role: string;
      };
    }
  }
}
