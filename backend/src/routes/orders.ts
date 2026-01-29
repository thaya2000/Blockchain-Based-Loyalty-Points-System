import { Router, Request, Response } from 'express';
import pool from '../db/index.js';
import type { Order, CreateOrderRequest } from '../../../shared/types.js';

const router = Router();

/**
 * Generate unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * GET /api/orders
 * List orders (filter by customer or merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerWallet, merchantId, status } = req.query;

    let query = `
      SELECT o.*, p.name as product_name, m.business_name as merchant_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customerWallet) {
      params.push(customerWallet);
      query += ` AND o.customer_wallet = $${params.length}`;
    }

    if (merchantId) {
      params.push(merchantId);
      query += ` AND o.merchant_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);

    const orders = result.rows.map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      customerWallet: row.customer_wallet,
      merchantId: row.merchant_id,
      productId: row.product_id,
      paymentType: row.payment_type,
      amountPaid: parseInt(row.amount_paid),
      loyaltyPointsEarned: parseInt(row.loyalty_points_earned),
      txSignature: row.tx_signature,
      status: row.status,
      createdAt: new Date(row.created_at),
      fulfilledAt: row.fulfilled_at ? new Date(row.fulfilled_at) : undefined,
      updatedAt: new Date(row.updated_at),
      productName: row.product_name,
      merchantName: row.merchant_name,
    }));

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/:id
 * Get order details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, p.name as product_name, p.image_url as product_image,
              m.business_name as merchant_name, m.wallet_address as merchant_wallet
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN merchants m ON o.merchant_id = m.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const row = result.rows[0];
    const order = {
      id: row.id,
      orderNumber: row.order_number,
      customerWallet: row.customer_wallet,
      merchantId: row.merchant_id,
      productId: row.product_id,
      paymentType: row.payment_type,
      amountPaid: parseInt(row.amount_paid),
      loyaltyPointsEarned: parseInt(row.loyalty_points_earned),
      txSignature: row.tx_signature,
      status: row.status,
      createdAt: new Date(row.created_at),
      fulfilledAt: row.fulfilled_at ? new Date(row.fulfilled_at) : undefined,
      updatedAt: new Date(row.updated_at),
      productName: row.product_name,
      productImage: row.product_image,
      merchantName: row.merchant_name,
      merchantWallet: row.merchant_wallet,
    };

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

/**
 * POST /api/orders
 * Create a new order (initiate purchase)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerWallet, productId, paymentType }: CreateOrderRequest = req.body;

    if (!customerWallet || !productId || !paymentType) {
      return res.status(400).json({
        success: false,
        error: 'customerWallet, productId, and paymentType are required',
      });
    }

    // Get product details
    const productResult = await pool.query(
      `SELECT p.*, m.wallet_address as merchant_wallet
       FROM products p
       JOIN merchants m ON p.merchant_id = m.id
       WHERE p.id = $1 AND p.is_available = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found or not available' });
    }

    const product = productResult.rows[0];

    // Check stock
    if (product.stock_quantity !== null && product.stock_quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Product out of stock' });
    }

    // Determine amount and points based on payment type
    let amountPaid: number;
    let loyaltyPointsEarned = 0;

    if (paymentType === 'sol') {
      amountPaid = parseInt(product.price_sol);
      loyaltyPointsEarned = parseInt(product.loyalty_points_reward);
    } else if (paymentType === 'loyalty_points') {
      if (!product.price_loyalty_points) {
        return res.status(400).json({
          success: false,
          error: 'This product cannot be purchased with loyalty points',
        });
      }
      amountPaid = parseInt(product.price_loyalty_points);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid payment type' });
    }

    const orderNumber = generateOrderNumber();

    const result = await pool.query(
      `INSERT INTO orders (
        order_number, customer_wallet, merchant_id, product_id,
        payment_type, amount_paid, loyalty_points_earned, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        orderNumber,
        customerWallet,
        product.merchant_id,
        productId,
        paymentType,
        amountPaid,
        loyaltyPointsEarned,
      ]
    );

    const row = result.rows[0];
    const order: Order & { merchantWallet?: string } = {
      id: row.id,
      orderNumber: row.order_number,
      customerWallet: row.customer_wallet,
      merchantId: row.merchant_id,
      productId: row.product_id,
      paymentType: row.payment_type,
      amountPaid: parseInt(row.amount_paid),
      loyaltyPointsEarned: parseInt(row.loyalty_points_earned),
      txSignature: row.tx_signature,
      status: row.status,
      createdAt: new Date(row.created_at),
      fulfilledAt: row.fulfilled_at ? new Date(row.fulfilled_at) : undefined,
      updatedAt: new Date(row.updated_at),
      merchantWallet: product.merchant_wallet,
    };

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

/**
 * PATCH /api/orders/:id
 * Update order status and details
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, txSignature } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;

      if (status === 'fulfilled') {
        updates.push(`fulfilled_at = NOW()`);
      }
    }

    if (txSignature) {
      updates.push(`tx_signature = $${paramIndex}`);
      values.push(txSignature);
      paramIndex++;

      if (status === 'confirmed' || !status) {
        updates.push(`status = 'confirmed'`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // If order is confirmed, decrease stock quantity
    if (status === 'confirmed') {
      await pool.query(
        `UPDATE products
         SET stock_quantity = CASE
           WHEN stock_quantity IS NOT NULL THEN stock_quantity - 1
           ELSE NULL
         END
         WHERE id = $1`,
        [result.rows[0].product_id]
      );
    }

    const row = result.rows[0];
    const order: Order = {
      id: row.id,
      orderNumber: row.order_number,
      customerWallet: row.customer_wallet,
      merchantId: row.merchant_id,
      productId: row.product_id,
      paymentType: row.payment_type,
      amountPaid: parseInt(row.amount_paid),
      loyaltyPointsEarned: parseInt(row.loyalty_points_earned),
      txSignature: row.tx_signature,
      status: row.status,
      createdAt: new Date(row.created_at),
      fulfilledAt: row.fulfilled_at ? new Date(row.fulfilled_at) : undefined,
      updatedAt: new Date(row.updated_at),
    };

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

export default router;
