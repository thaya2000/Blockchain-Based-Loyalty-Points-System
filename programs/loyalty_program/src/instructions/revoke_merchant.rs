use anchor_lang::prelude::*;

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState};

#[derive(Accounts)]
pub struct RevokeMerchant<'info> {
    /// Platform admin - only they can revoke merchants
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Platform state - verify admin authority
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ LoyaltyError::UnauthorizedAdmin
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// The merchant wallet to revoke
    /// CHECK: This is the merchant's wallet address we're revoking
    pub merchant_wallet: UncheckedAccount<'info>,

    /// Merchant record PDA - update authorization status
    #[account(
        mut,
        seeds = [MerchantRecord::SEED, merchant_wallet.key().as_ref()],
        bump = merchant_record.bump,
        constraint = merchant_record.is_authorized @ LoyaltyError::MerchantNotRegistered
    )]
    pub merchant_record: Account<'info, MerchantRecord>,
}

pub fn handler(ctx: Context<RevokeMerchant>) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;
    let merchant_wallet = ctx.accounts.merchant_wallet.key();

    merchant_record.is_authorized = false;

    platform_state.merchant_count = platform_state
        .merchant_count
        .checked_sub(1)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!("Merchant revoked: {}", merchant_wallet);

    emit!(MerchantRevoked {
        merchant: merchant_wallet,
        revoked_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct MerchantRevoked {
    pub merchant: Pubkey,
    pub revoked_at: i64,
}
