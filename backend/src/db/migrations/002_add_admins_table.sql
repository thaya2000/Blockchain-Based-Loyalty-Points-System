-- Migration: Add admins table for admin authorization
-- Created: 2026-01-29

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'moderator'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on wallet_address for fast lookups
CREATE INDEX idx_admins_wallet_address ON admins (wallet_address);

CREATE INDEX idx_admins_is_active ON admins (is_active);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- Insert default admin (replace with your actual admin wallet address)
-- This is a placeholder - you should update this with your actual wallet address
-- COMMENTED OUT: Use the manage-admins.sh script instead to add admins
-- INSERT INTO admins (wallet_address, name, email, role)
-- VALUES ('REPLACE_WITH_YOUR_WALLET_ADDRESS', 'Platform Admin', 'admin@loyalty.com', 'super_admin')
-- ON CONFLICT (wallet_address) DO NOTHING;

-- Note: After running this migration, use the manage-admins.sh script to add your actual admin wallet