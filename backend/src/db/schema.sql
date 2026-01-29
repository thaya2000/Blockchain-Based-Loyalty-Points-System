-- ============================================
-- Loyalty Platform Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users (wallet_address);

-- ============================================
-- Merchants Table
-- ============================================
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'approved',
            'rejected'
        )
    ),
    is_active BOOLEAN DEFAULT true,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_wallet ON merchants (wallet_address);

CREATE INDEX idx_merchants_status ON merchants (status);

CREATE INDEX idx_merchants_active ON merchants (is_active);

CREATE INDEX idx_merchants_category ON merchants (category);

-- ============================================
-- Rewards Catalog
-- ============================================
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    merchant_id UUID NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    image_url TEXT,
    terms_conditions TEXT,
    quantity_available INTEGER, -- NULL = unlimited
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_merchant ON rewards (merchant_id);

CREATE INDEX idx_rewards_available ON rewards (is_available);

CREATE INDEX idx_rewards_cost ON rewards (points_cost);

-- ============================================
-- Products Table
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    merchant_id UUID NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price_sol BIGINT NOT NULL CHECK (price_sol > 0), -- Price in lamports
    price_loyalty_points BIGINT CHECK (price_loyalty_points > 0), -- Price in loyalty points (NULL if not available)
    loyalty_points_reward BIGINT NOT NULL CHECK (loyalty_points_reward >= 0), -- Points earned when bought with SOL
    image_url TEXT,
    stock_quantity INTEGER, -- NULL = unlimited
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_merchant ON products (merchant_id);

CREATE INDEX idx_products_available ON products (is_available);

CREATE INDEX idx_products_price_sol ON products (price_sol);

CREATE INDEX idx_products_price_points ON products (price_loyalty_points);

-- ============================================
-- Orders Table
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_wallet VARCHAR(44) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants (id),
    product_id UUID NOT NULL REFERENCES products (id),
    payment_type VARCHAR(20) NOT NULL CHECK (
        payment_type IN ('sol', 'loyalty_points')
    ),
    amount_paid BIGINT NOT NULL, -- In lamports or loyalty points
    loyalty_points_earned BIGINT DEFAULT 0, -- Points earned (if paid with SOL)
    tx_signature VARCHAR(88), -- On-chain transaction signature
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

CREATE INDEX idx_orders_customer ON orders (customer_wallet);

CREATE INDEX idx_orders_merchant ON orders (merchant_id);

CREATE INDEX idx_orders_status ON orders (status);

CREATE INDEX idx_orders_created ON orders (created_at DESC);

CREATE INDEX idx_orders_tx_sig ON orders (tx_signature);

-- ============================================
-- Transaction Log (Off-chain reference)
-- This supplements on-chain data with metadata
-- ============================================
CREATE TABLE transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    tx_signature VARCHAR(88) NOT NULL UNIQUE,
    tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('mint', 'redeem')),
    user_wallet VARCHAR(44),
    merchant_wallet VARCHAR(44),
    points_amount BIGINT NOT NULL,
    reward_id UUID REFERENCES rewards (id),
    purchase_reference VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (
        status IN (
            'pending',
            'confirmed',
            'failed'
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_signature ON transaction_log (tx_signature);

CREATE INDEX idx_tx_user ON transaction_log (user_wallet);

CREATE INDEX idx_tx_merchant ON transaction_log (merchant_wallet);

CREATE INDEX idx_tx_type ON transaction_log (tx_type);

CREATE INDEX idx_tx_created ON transaction_log (created_at DESC);

-- ============================================
-- Platform Analytics (Aggregated stats)
-- ============================================
CREATE TABLE platform_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE UNIQUE NOT NULL,
    total_users INTEGER DEFAULT 0,
    total_merchants INTEGER DEFAULT 0,
    total_points_minted BIGINT DEFAULT 0,
    total_points_redeemed BIGINT DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stats_date ON platform_stats (stat_date DESC);

-- ============================================
-- Updated at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();