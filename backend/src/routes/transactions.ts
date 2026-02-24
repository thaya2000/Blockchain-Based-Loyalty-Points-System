import { Router, Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service.js';
import { ethereumService } from '../services/ethereum.service.js';

const router = Router();

/**
 * POST /api/transactions/log-mint
 * Log a mint transaction after on-chain confirmation
 */
router.post('/log-mint', async (req: Request, res: Response) => {
  try {
    const { txSignature, userWallet, merchantWallet, pointsAmount, purchaseReference } = req.body;

    if (!txSignature || !userWallet || !merchantWallet || !pointsAmount) {
      return res.status(400).json({
        success: false,
        error: 'txSignature, userWallet, merchantWallet, and pointsAmount are required',
      });
    }

    // Verify transaction exists on-chain
    const tx = await ethereumService.getTransaction(txSignature);
    if (!tx) {
      return res.status(400).json({
        success: false,
        error: 'Transaction not found on-chain',
      });
    }

    const transaction = await loyaltyService.logTransaction(
      txSignature,
      'mint',
      userWallet,
      merchantWallet,
      pointsAmount,
      undefined,
      purchaseReference
    );

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error logging mint transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to log transaction' });
  }
});

/**
 * POST /api/transactions/log-redeem
 * Log a redemption transaction after on-chain confirmation
 */
router.post('/log-redeem', async (req: Request, res: Response) => {
  try {
    const { txSignature, userWallet, merchantWallet, pointsAmount, rewardId } = req.body;

    if (!txSignature || !userWallet || !merchantWallet || !pointsAmount) {
      return res.status(400).json({
        success: false,
        error: 'txSignature, userWallet, merchantWallet, and pointsAmount are required',
      });
    }

    // Verify transaction exists on-chain
    const tx = await ethereumService.getTransaction(txSignature);
    if (!tx) {
      return res.status(400).json({
        success: false,
        error: 'Transaction not found on-chain',
      });
    }

    const transaction = await loyaltyService.logTransaction(
      txSignature,
      'redeem',
      userWallet,
      merchantWallet,
      pointsAmount,
      rewardId
    );

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error logging redeem transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to log transaction' });
  }
});

/**
 * GET /api/transactions/:signature
 * Get transaction details by signature
 */
router.get('/:signature', async (req: Request, res: Response) => {
  try {
    const { signature } = req.params;

    // Get on-chain transaction details
    const onChainTx = await ethereumService.getTransaction(signature);

    res.json({
      success: true,
      data: {
        signature,
        blockNumber: onChainTx?.blockNumber,
        timestamp: onChainTx?.timestamp,
        status: onChainTx?.status,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

export default router;
