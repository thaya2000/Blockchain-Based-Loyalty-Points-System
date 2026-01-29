import { Router, Request, Response } from 'express';
import pool from '../db/index.js';
import type { Merchant, ApproveMerchantRequest } from '../../../shared/types.js';
import { requireAdmin, checkAdminStatus } from '../middleware/adminAuth.js';

const router = Router();

/**
 * GET /api/admin/check
 * Check if a wallet address has admin privileges
 * This is a public endpoint (no auth required) for the frontend to check status
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.wallet as string;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
      });
    }

    const isAdmin = await checkAdminStatus(walletAddress);

    res.json({
      success: true,
      isAdmin,
      walletAddress,
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status',
    });
  }
});

/**
 * GET /api/admin/merchants/pending
 * Get all pending merchant registrations
 * Protected: Requires admin authorization
 */
router.get('/merchants/pending', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM merchants
       WHERE status = 'pending'
       ORDER BY created_at DESC`
    );

    const merchants: Merchant[] = result.rows.map(row => ({
      id: row.id,
      walletAddress: row.wallet_address,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      businessAddress: row.business_address,
      category: row.category,
      status: row.status,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('Error fetching pending merchants:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending merchants' });
  }
});

/**
 * GET /api/admin/merchants
 * Get all merchants with optional status filter
 * Protected: Requires admin authorization
 */
router.get('/merchants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM merchants';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const merchants: Merchant[] = result.rows.map(row => ({
      id: row.id,
      walletAddress: row.wallet_address,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      businessAddress: row.business_address,
      category: row.category,
      status: row.status,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({ success: true, data: merchants });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch merchants' });
  }
});

/**
 * POST /api/admin/merchants/:id/approve
 * Approve a merchant registration
 * Protected: Requires admin authorization
 */
router.post('/merchants/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if merchant exists and is pending
    const checkResult = await pool.query(
      'SELECT * FROM merchants WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const merchant = checkResult.rows[0];

    if (merchant.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Merchant is already ${merchant.status}`,
      });
    }

    // Update merchant status to approved
    const result = await pool.query(
      `UPDATE merchants
       SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const row = result.rows[0];
    const updatedMerchant: Merchant = {
      id: row.id,
      walletAddress: row.wallet_address,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      businessAddress: row.business_address,
      category: row.category,
      status: row.status,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    res.json({
      success: true,
      data: updatedMerchant,
      message: `Merchant "${updatedMerchant.businessName}" approved successfully`,
    });
  } catch (error) {
    console.error('Error approving merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to approve merchant' });
  }
});

/**
 * POST /api/admin/merchants/:id/reject
 * Reject a merchant registration
 * Protected: Requires admin authorization
 */
router.post('/merchants/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if merchant exists and is pending
    const checkResult = await pool.query(
      'SELECT * FROM merchants WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const merchant = checkResult.rows[0];

    if (merchant.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Merchant is already ${merchant.status}`,
      });
    }

    // Update merchant status to rejected
    const result = await pool.query(
      `UPDATE merchants
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const row = result.rows[0];
    const updatedMerchant: Merchant = {
      id: row.id,
      walletAddress: row.wallet_address,
      businessName: row.business_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      businessAddress: row.business_address,
      category: row.category,
      status: row.status,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    res.json({
      success: true,
      data: updatedMerchant,
      message: `Merchant "${updatedMerchant.businessName}" rejected`,
    });
  } catch (error) {
    console.error('Error rejecting merchant:', error);
    res.status(500).json({ success: false, error: 'Failed to reject merchant' });
  }
});
/**
 * GET /api/admin/stats
 * Get platform statistics
 * Protected: Requires admin authorization
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const merchantsResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) as total
       FROM merchants`
    );

    const productsResult = await pool.query(
      `SELECT COUNT(*) as total FROM products WHERE is_available = true`
    );

    const ordersResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'fulfilled') as fulfilled,
        SUM(CASE WHEN payment_type = 'sol' THEN amount_paid ELSE 0 END) as total_sol_revenue
       FROM orders`
    );

    const stats = {
      merchants: {
        total: parseInt(merchantsResult.rows[0].total),
        approved: parseInt(merchantsResult.rows[0].approved),
        pending: parseInt(merchantsResult.rows[0].pending),
        rejected: parseInt(merchantsResult.rows[0].rejected),
      },
      products: {
        total: parseInt(productsResult.rows[0].total),
      },
      orders: {
        total: parseInt(ordersResult.rows[0].total),
        confirmed: parseInt(ordersResult.rows[0].confirmed),
        fulfilled: parseInt(ordersResult.rows[0].fulfilled),
        totalSolRevenue: parseInt(ordersResult.rows[0].total_sol_revenue || '0'),
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
