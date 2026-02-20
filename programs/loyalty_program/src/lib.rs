use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("9RkPYyU3tB5X9g2TkBPiZHUrVNRZjwjZ3Eu8LZhK4LXj");

#[program]
pub mod loyalty_program {
    use super::*;

    /// Initialize the loyalty platform with admin authority and create SPL token mint
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        token_decimals: u8,
        max_supply: u64,
        base_mint_fee: u64,
        fee_rate_per_thousand: u64,
        sol_to_points_ratio: u64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, token_decimals, max_supply, base_mint_fee, fee_rate_per_thousand, sol_to_points_ratio)
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

    /// Purchase product with SOL and earn loyalty points
    pub fn purchase_product_with_sol(
        ctx: Context<PurchaseProductWithSol>,
        product_id_hash: [u8; 32],
        price_sol: u64,
        loyalty_points_reward: u64,
    ) -> Result<()> {
        instructions::purchase_product::handler(ctx, product_id_hash, price_sol, loyalty_points_reward)
    }

    /// Redeem loyalty points at a merchant (consumer)
    pub fn redeem_points(
        ctx: Context<RedeemPoints>,
        amount: u64,
        reward_id: String,
    ) -> Result<()> {
        instructions::redeem_points::handler(ctx, amount, reward_id)
    }

    /// Merchant deposits SOL to receive loyalty points
    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        sol_amount: u64,
    ) -> Result<()> {
        instructions::deposit_sol::handler(ctx, sol_amount)
    }

    /// Purchase product with loyalty points (burns points)
    pub fn purchase_product_with_points(
        ctx: Context<PurchaseProductWithPoints>,
        product_id_hash: [u8; 32],
        points_amount: u64,
    ) -> Result<()> {
        instructions::purchase_with_points::handler(ctx, product_id_hash, points_amount)
    }
}
