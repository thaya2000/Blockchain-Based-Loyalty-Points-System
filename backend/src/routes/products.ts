import { Router, Request, Response } from 'express';
import pool from '../db/index.js';
import type { Product, CreateProductRequest } from '../../../shared/types.js';

const router = Router();

/**
 * GET /api/products
 * List all available products (optionally filter by merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { merchantId, available } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (merchantId) {
      params.push(merchantId);
      query += ` AND merchant_id = $${params.length}`;
    }

    if (available === 'true') {
      query += ' AND is_available = true';
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const products: Product[] = result.rows.map(row => ({
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      priceSol: parseInt(row.price_sol),
      priceLoyaltyPoints: row.price_loyalty_points ? parseInt(row.price_loyalty_points) : undefined,
      loyaltyPointsReward: parseInt(row.loyalty_points_reward),
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:id
 * Get product details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, m.business_name as merchant_name, m.wallet_address as merchant_wallet
       FROM products p
       JOIN merchants m ON p.merchant_id = m.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const row = result.rows[0];
    const product: Product & { merchantName?: string; merchantWallet?: string } = {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      priceSol: parseInt(row.price_sol),
      priceLoyaltyPoints: row.price_loyalty_points ? parseInt(row.price_loyalty_points) : undefined,
      loyaltyPointsReward: parseInt(row.loyalty_points_reward),
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      merchantName: row.merchant_name,
      merchantWallet: row.merchant_wallet,
    };

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products
 * Create a new product (merchant only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      merchantId,
      name,
      description,
      priceSol,
      priceLoyaltyPoints,
      loyaltyPointsReward,
      imageUrl,
      stockQuantity,
    }: CreateProductRequest = req.body;

    if (!merchantId || !name || !priceSol || loyaltyPointsReward === undefined) {
      return res.status(400).json({
        success: false,
        error: 'merchantId, name, priceSol, and loyaltyPointsReward are required',
      });
    }

    // Verify merchant exists and is approved
    const merchantCheck = await pool.query(
      'SELECT status FROM merchants WHERE id = $1',
      [merchantId]
    );

    if (merchantCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    if (merchantCheck.rows[0].status !== 'approved') {
      return res.status(403).json({ success: false, error: 'Merchant is not approved' });
    }

    const result = await pool.query(
      `INSERT INTO products (
        merchant_id, name, description, price_sol, price_loyalty_points,
        loyalty_points_reward, image_url, stock_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        merchantId,
        name,
        description,
        priceSol,
        priceLoyaltyPoints || null,
        loyaltyPointsReward,
        imageUrl || null,
        stockQuantity || null,
      ]
    );

    const row = result.rows[0];
    const product: Product = {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      priceSol: parseInt(row.price_sol),
      priceLoyaltyPoints: row.price_loyalty_points ? parseInt(row.price_loyalty_points) : undefined,
      loyaltyPointsReward: parseInt(row.loyalty_points_reward),
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

/**
 * PATCH /api/products/:id
 * Update product details
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name',
      'description',
      'price_sol',
      'price_loyalty_points',
      'loyalty_points_reward',
      'image_url',
      'stock_quantity',
      'is_available',
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClause.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${setClause.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const row = result.rows[0];
    const product: Product = {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      priceSol: parseInt(row.price_sol),
      priceLoyaltyPoints: row.price_loyalty_points ? parseInt(row.price_loyalty_points) : undefined,
      loyaltyPointsReward: parseInt(row.loyalty_points_reward),
      imageUrl: row.image_url,
      stockQuantity: row.stock_quantity,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export default router;
