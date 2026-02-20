use anchor_lang::prelude::*;

/// Platform state account - stores global configuration
#[account]
#[derive(InitSpace)]
pub struct PlatformState {
    /// Admin authority who can register/revoke merchants
    pub admin: Pubkey,
    
    /// The SPL token mint for loyalty points
    pub token_mint: Pubkey,
    
    /// Protocol treasury for collecting fees
    pub protocol_treasury: Pubkey,
    
    /// Maximum total supply of loyalty tokens
    pub max_supply: u64,
    
    /// Current total minted supply
    pub current_supply: u64,
    
    /// Token decimals (typically 6 or 9)
    pub token_decimals: u8,
    
    /// Number of registered merchants
    pub merchant_count: u32,
    
    /// Whether the platform is active
    pub is_active: bool,
    
    /// Base fee for minting (in lamports)
    pub base_mint_fee: u64,
    
    /// Fee rate per 1000 loyalty points (in lamports)
    pub fee_rate_per_thousand: u64,
    
    /// Total fees collected
    pub total_fees_collected: u64,
    
    /// SOL to loyalty points conversion ratio
    /// e.g. 100 means 1 SOL = 100 loyalty points (before decimal adjustment)
    pub sol_to_points_ratio: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl PlatformState {
    pub const SEED: &'static [u8] = b"platform_state";
}

/// Merchant record - stores authorization status for each merchant
#[account]
#[derive(InitSpace)]
pub struct MerchantRecord {
    /// Merchant's wallet address
    pub wallet: Pubkey,
    
    /// Whether the merchant is currently authorized
    pub is_authorized: bool,
    
    /// Maximum points this merchant can mint (0 = unlimited within platform max)
    pub mint_allowance: u64,
    
    /// Total points minted by this merchant
    pub total_minted: u64,
    
    /// Total points redeemed at this merchant
    pub total_redeemed: u64,
    
    /// Total fees paid by this merchant
    pub total_fees_paid: u64,
    
    /// Timestamp when merchant was registered
    pub registered_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl MerchantRecord {
    pub const SEED: &'static [u8] = b"merchant";
}

/// Product purchase record - stores product purchase details
#[account]
#[derive(InitSpace)]
pub struct PurchaseRecord {
    /// Customer wallet
    pub customer: Pubkey,
    
    /// Merchant wallet
    pub merchant: Pubkey,
    
    /// Product ID hash (32 bytes)
    pub product_id_hash: [u8; 32],
    
    /// Payment type: 0 = SOL, 1 = Loyalty Points
    pub payment_type: u8,
    
    /// Amount paid (in lamports for SOL, or token amount for points)
    pub amount_paid: u64,
    
    /// Loyalty points earned (if paid with SOL)
    pub points_earned: u64,
    
    /// Purchase timestamp
    pub purchased_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl PurchaseRecord {
    pub const SEED: &'static [u8] = b"purchase";
}
