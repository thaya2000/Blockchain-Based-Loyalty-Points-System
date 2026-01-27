use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState};

#[derive(Accounts)]
pub struct MintPoints<'info> {
    /// The authorized merchant issuing points
    #[account(mut)]
    pub merchant: Signer<'info>,

    /// Platform state - for mint authority
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.is_active @ LoyaltyError::PlatformInactive
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// Merchant record - verify authorization
    #[account(
        mut,
        seeds = [MerchantRecord::SEED, merchant.key().as_ref()],
        bump = merchant_record.bump,
        constraint = merchant_record.is_authorized @ LoyaltyError::UnauthorizedMerchant
    )]
    pub merchant_record: Account<'info, MerchantRecord>,

    /// The loyalty token mint
    #[account(
        mut,
        seeds = [b"loyalty_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// The consumer receiving points
    /// CHECK: This is the consumer's wallet address
    pub consumer: UncheckedAccount<'info>,

    /// Consumer's associated token account for loyalty tokens
    #[account(
        init_if_needed,
        payer = merchant,
        associated_token::mint = token_mint,
        associated_token::authority = consumer
    )]
    pub consumer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MintPoints>,
    amount: u64,
    purchase_reference: String,
) -> Result<()> {
    require!(amount > 0, LoyaltyError::InvalidAmount);
    require!(
        purchase_reference.len() <= 64,
        LoyaltyError::ReferenceTooLong
    );

    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;

    // Check mint allowance
    if merchant_record.mint_allowance > 0 {
        let remaining_allowance = merchant_record
            .mint_allowance
            .checked_sub(merchant_record.total_minted)
            .ok_or(LoyaltyError::ArithmeticOverflow)?;

        require!(
            amount <= remaining_allowance,
            LoyaltyError::ExceedsMintAllowance
        );
    }

    // Check max supply
    let new_supply = platform_state
        .current_supply
        .checked_add(amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    require!(
        new_supply <= platform_state.max_supply,
        LoyaltyError::ExceedsMaxSupply
    );

    // Mint tokens using PDA authority
    let seeds = &[
        PlatformState::SEED,
        &[platform_state.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.consumer_token_account.to_account_info(),
                authority: platform_state.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    // Update state
    platform_state.current_supply = new_supply;
    merchant_record.total_minted = merchant_record
        .total_minted
        .checked_add(amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!(
        "Minted {} points to consumer {} by merchant {}",
        amount,
        ctx.accounts.consumer.key(),
        ctx.accounts.merchant.key()
    );

    emit!(PointsIssued {
        merchant: ctx.accounts.merchant.key(),
        consumer: ctx.accounts.consumer.key(),
        amount,
        purchase_reference,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct PointsIssued {
    pub merchant: Pubkey,
    pub consumer: Pubkey,
    pub amount: u64,
    pub purchase_reference: String,
    pub timestamp: i64,
}
