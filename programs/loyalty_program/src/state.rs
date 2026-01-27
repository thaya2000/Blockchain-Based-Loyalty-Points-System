use anchor_lang::prelude::*;

/// Platform state account - stores global configuration
#[account]
#[derive(InitSpace)]
pub struct PlatformState {
    /// Admin authority who can register/revoke merchants
    pub admin: Pubkey,
    
    /// The SPL token mint for loyalty points
    pub token_mint: Pubkey,
    
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
    
    /// Timestamp when merchant was registered
    pub registered_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl MerchantRecord {
    pub const SEED: &'static [u8] = b"merchant";
}
