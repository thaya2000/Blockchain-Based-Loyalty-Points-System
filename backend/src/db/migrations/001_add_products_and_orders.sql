-- ============================================
-- Migration: Add Products, Orders, and Merchant Approval
-- Date: 2026-01-29
-- ============================================

-- Add status and approval fields to merchants table
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN (
        'pending',
        'approved',
        'rejected'
    )
);

ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants (status);

-- ============================================
-- Products Table
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    merchant_id UUID NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price_sol BIGINT NOT NULL CHECK (price_sol > 0),
    price_loyalty_points BIGINT CHECK (price_loyalty_points > 0),
    loyalty_points_reward BIGINT NOT NULL CHECK (loyalty_points_reward >= 0),
    image_url TEXT,
    stock_quantity INTEGER,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_merchant ON products (merchant_id);

CREATE INDEX IF NOT EXISTS idx_products_available ON products (is_available);

CREATE INDEX IF NOT EXISTS idx_products_price_sol ON products (price_sol);

CREATE INDEX IF NOT EXISTS idx_products_price_points ON products (price_loyalty_points);

-- ============================================
-- Orders Table
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_wallet VARCHAR(44) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants (id),
    product_id UUID NOT NULL REFERENCES products (id),
    payment_type VARCHAR(20) NOT NULL CHECK (
        payment_type IN ('sol', 'loyalty_points')
    ),
    amount_paid BIGINT NOT NULL,
    loyalty_points_earned BIGINT DEFAULT 0,
    tx_signature VARCHAR(88),
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'confirmed',
            'fulfilled',
            'cancelled'
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_wallet);

CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders (merchant_id);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tx_sig ON orders (tx_signature);

-- ============================================
-- Add triggers for new tables
-- ============================================
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Update existing merchants to 'approved' status
-- (For backwards compatibility)
-- ============================================
UPDATE merchants SET status = 'approved' WHERE status = 'pending';