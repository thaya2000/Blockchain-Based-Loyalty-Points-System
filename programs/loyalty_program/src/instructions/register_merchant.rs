use anchor_lang::prelude::*;

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState};

#[derive(Accounts)]
pub struct RegisterMerchant<'info> {
    /// Platform admin - only they can register merchants
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Platform state - verify admin authority
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ LoyaltyError::UnauthorizedAdmin,
        constraint = platform_state.is_active @ LoyaltyError::PlatformInactive
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// The merchant wallet to authorize
    /// CHECK: This is the merchant's wallet address we're registering
    pub merchant_wallet: UncheckedAccount<'info>,

    /// Merchant record PDA - stores authorization status
    #[account(
        init,
        payer = admin,
        space = 8 + MerchantRecord::INIT_SPACE,
        seeds = [MerchantRecord::SEED, merchant_wallet.key().as_ref()],
        bump
    )]
    pub merchant_record: Account<'info, MerchantRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterMerchant>, mint_allowance: u64) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;
    let merchant_wallet = ctx.accounts.merchant_wallet.key();

    let clock = Clock::get()?;

    merchant_record.wallet = merchant_wallet;
    merchant_record.is_authorized = true;
    merchant_record.mint_allowance = mint_allowance;
    merchant_record.total_minted = 0;
    merchant_record.total_redeemed = 0;
    merchant_record.registered_at = clock.unix_timestamp;
    merchant_record.bump = ctx.bumps.merchant_record;

    platform_state.merchant_count = platform_state
        .merchant_count
        .checked_add(1)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!("Merchant registered: {}", merchant_wallet);
    msg!("Mint allowance: {}", mint_allowance);

    emit!(MerchantRegistered {
        merchant: merchant_wallet,
        mint_allowance,
        registered_at: clock.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct MerchantRegistered {
    pub merchant: Pubkey,
    pub mint_allowance: u64,
    pub registered_at: i64,
}
