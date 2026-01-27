use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState};

#[derive(Accounts)]
pub struct RedeemPoints<'info> {
    /// The consumer redeeming points
    #[account(mut)]
    pub consumer: Signer<'info>,

    /// Platform state
    #[account(
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.is_active @ LoyaltyError::PlatformInactive
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// The merchant where redemption occurs
    /// CHECK: This is the merchant's wallet address
    pub merchant: UncheckedAccount<'info>,

    /// Merchant record - verify registration
    #[account(
        mut,
        seeds = [MerchantRecord::SEED, merchant.key().as_ref()],
        bump = merchant_record.bump,
        constraint = merchant_record.is_authorized @ LoyaltyError::UnauthorizedMerchant
    )]
    pub merchant_record: Account<'info, MerchantRecord>,

    /// The loyalty token mint
    #[account(
        seeds = [b"loyalty_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// Consumer's token account
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = consumer
    )]
    pub consumer_token_account: Account<'info, TokenAccount>,

    /// Merchant's token account (receives the redeemed tokens)
    #[account(
        init_if_needed,
        payer = consumer,
        associated_token::mint = token_mint,
        associated_token::authority = merchant
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RedeemPoints>,
    amount: u64,
    reward_id: String,
) -> Result<()> {
    require!(amount > 0, LoyaltyError::InvalidAmount);
    require!(reward_id.len() <= 64, LoyaltyError::ReferenceTooLong);

    let consumer_balance = ctx.accounts.consumer_token_account.amount;
    require!(
        consumer_balance >= amount,
        LoyaltyError::InsufficientBalance
    );

    // Transfer tokens from consumer to merchant
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.consumer_token_account.to_account_info(),
                to: ctx.accounts.merchant_token_account.to_account_info(),
                authority: ctx.accounts.consumer.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update merchant stats
    let merchant_record = &mut ctx.accounts.merchant_record;
    merchant_record.total_redeemed = merchant_record
        .total_redeemed
        .checked_add(amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!(
        "Consumer {} redeemed {} points at merchant {}",
        ctx.accounts.consumer.key(),
        amount,
        ctx.accounts.merchant.key()
    );

    emit!(PointsRedeemed {
        consumer: ctx.accounts.consumer.key(),
        merchant: ctx.accounts.merchant.key(),
        amount,
        reward_id,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct PointsRedeemed {
    pub consumer: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub reward_id: String,
    pub timestamp: i64,
}
