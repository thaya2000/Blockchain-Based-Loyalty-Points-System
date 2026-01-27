import { Router, Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service.js';
import { solanaService } from '../services/solana.service.js';

const router = Router();

/**
 * GET /api/users/:wallet
 * Get user profile by wallet address
 */
router.get('/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const user = await loyaltyService.getUserByWallet(wallet);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get on-chain balance
    const balance = await loyaltyService.getUserBalance(wallet);

    res.json({
      success: true,
      data: {
        ...user,
        loyaltyBalance: balance,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Create or update user profile
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { walletAddress, displayName, email } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required',
      });
    }

    const user = await loyaltyService.createUser(walletAddress, displayName, email);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

/**
 * GET /api/users/:wallet/balance
 * Get user's loyalty token balance (on-chain)
 */
router.get('/:wallet/balance', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const balance = await solanaService.getBalance(wallet);

    res.json({
      success: true,
      data: {
        walletAddress: wallet,
        balance,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

/**
 * GET /api/users/:wallet/transactions
 * Get user's transaction history
 */
router.get('/:wallet/transactions', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const { limit } = req.query;

    const transactions = await loyaltyService.getTransactionsByUser(
      wallet,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

export default router;
