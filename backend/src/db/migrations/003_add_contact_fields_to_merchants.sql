-- Add contact fields to merchants table
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS business_address VARCHAR(500);