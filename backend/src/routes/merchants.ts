import { Router, Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service.js';
import { solanaService } from '../services/solana.service.js';

const router = Router();

/**
 * GET /api/merchants
 * List all active merchants
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, includeInactive } = req.query;

    let merchants;
    if (category && typeof category === 'string') {
      merchants = await loyaltyService.getMerchantsByCategory(category);
    } else {
      merchants = await loyaltyService.getAllMerchants(includeInactive !== 'true');
    }

    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch merchants' });
  }
});

/**
 * GET /api/merchants/:wallet
 * Get merchant by wallet address
 */
router.get('/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const merchant = await loyaltyService.getMerchantByWallet(wallet);

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    // Check on-chain authorization status
    const isAuthorized = await solanaService.isMerchantAuthorized(wallet);

    res.json({
      success: true,
      data: {
        ...merchant,
        onChainAuthorized: isAuthorized,
      },
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch merchant' });
  }
});

/**
 * POST /api/merchants
 * Register a new merchant (off-chain metadata)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { walletAddress, businessName, category, logoUrl, contactEmail, contactPhone, businessAddress } = req.body;

    if (!walletAddress || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress and businessName are required',
      });
    }

    // Check if merchant already exists
    const existing = await loyaltyService.getMerchantByWallet(walletAddress);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Merchant with this wallet already exists',
      });
    }

    const merchant = await loyaltyService.createMerchant(
      walletAddress,
      businessName,
      category,
      logoUrl,
      contactEmail,
      contactPhone,
      businessAddress
    );

    res.status(201).json({ success: true, data: merchant });
  } catch (error) {
    console.error('Error creating merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to create merchant' });
  }
});

/**
 * PATCH /api/merchants/:wallet
 * Update merchant metadata
 */
router.patch('/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const updates = req.body;

    const merchant = await loyaltyService.updateMerchant(wallet, updates);

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    res.json({ success: true, data: merchant });
  } catch (error) {
    console.error('Error updating merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to update merchant' });
  }
});

/**
 * GET /api/merchants/:wallet/rewards
 * Get rewards offered by a merchant
 */
router.get('/:wallet/rewards', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const merchant = await loyaltyService.getMerchantByWallet(wallet);

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const rewards = await loyaltyService.getRewardsByMerchant(merchant.id);
    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Error fetching merchant rewards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rewards' });
  }
});

/**
 * GET /api/merchants/:wallet/transactions
 * Get transaction history for a merchant
 */
router.get('/:wallet/transactions', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const { limit } = req.query;

    const transactions = await loyaltyService.getTransactionsByMerchant(
      wallet,
      limit ? parseInt(limit as string, 10) : 50
    );

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching merchant transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

export default router;
