use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("DdG9NoqiKjAmoiGoKprBi12XXhLAJbjfqyNXYQXhELpk");

#[program]
pub mod loyalty_program {
    use super::*;

    /// Initialize the loyalty platform with admin authority and create SPL token mint
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        token_decimals: u8,
        max_supply: u64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, token_decimals, max_supply)
    }

    /// Register a new merchant (admin only)
    pub fn register_merchant(
        ctx: Context<RegisterMerchant>,
        mint_allowance: u64,
    ) -> Result<()> {
        instructions::register_merchant::handler(ctx, mint_allowance)
    }

    /// Revoke a merchant's authorization (admin only)
    pub fn revoke_merchant(ctx: Context<RevokeMerchant>) -> Result<()> {
        instructions::revoke_merchant::handler(ctx)
    }

    /// Mint loyalty points to a consumer (merchant only)
    pub fn mint_points(
        ctx: Context<MintPoints>,
        amount: u64,
        purchase_reference: String,
    ) -> Result<()> {
        instructions::mint_points::handler(ctx, amount, purchase_reference)
    }

    /// Redeem loyalty points at a merchant (consumer)
    pub fn redeem_points(
        ctx: Context<RedeemPoints>,
        amount: u64,
        reward_id: String,
    ) -> Result<()> {
        instructions::redeem_points::handler(ctx, amount, reward_id)
    }
}
