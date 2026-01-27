import { Router, Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service.js';

const router = Router();

/**
 * GET /api/rewards
 * List all available rewards
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { merchantId, maxPoints, minPoints } = req.query;

    let rewards;
    if (merchantId && typeof merchantId === 'string') {
      rewards = await loyaltyService.getRewardsByMerchant(merchantId);
    } else {
      rewards = await loyaltyService.getAllAvailableRewards();
    }

    // Filter by point range if specified
    if (minPoints || maxPoints) {
      const min = minPoints ? parseInt(minPoints as string, 10) : 0;
      const max = maxPoints ? parseInt(maxPoints as string, 10) : Infinity;
      rewards = rewards.filter(
        (r) => r.pointsCost >= min && r.pointsCost <= max
      );
    }

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rewards' });
  }
});

/**
 * GET /api/rewards/:id
 * Get reward by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reward = await loyaltyService.getRewardById(id);

    if (!reward) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    res.json({ success: true, data: reward });
  } catch (error) {
    console.error('Error fetching reward:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reward' });
  }
});

/**
 * POST /api/rewards
 * Create a new reward (merchant only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { merchantId, name, pointsCost, description, imageUrl } = req.body;

    if (!merchantId || !name || !pointsCost) {
      return res.status(400).json({
        success: false,
        error: 'merchantId, name, and pointsCost are required',
      });
    }

    if (pointsCost <= 0) {
      return res.status(400).json({
        success: false,
        error: 'pointsCost must be greater than 0',
      });
    }

    const reward = await loyaltyService.createReward(
      merchantId,
      name,
      pointsCost,
      description,
      imageUrl
    );

    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ success: false, error: 'Failed to create reward' });
  }
});

/**
 * PATCH /api/rewards/:id
 * Update a reward
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const reward = await loyaltyService.updateReward(id, updates);

    if (!reward) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    res.json({ success: true, data: reward });
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({ success: false, error: 'Failed to update reward' });
  }
});

/**
 * DELETE /api/rewards/:id
 * Soft delete a reward (set unavailable)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reward = await loyaltyService.updateReward(id, { isAvailable: false });

    if (!reward) {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }

    res.json({ success: true, message: 'Reward deleted' });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reward' });
  }
});

export default router;
