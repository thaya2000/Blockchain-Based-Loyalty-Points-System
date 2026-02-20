use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState};

#[derive(Accounts)]
pub struct DepositSol<'info> {
    /// The merchant depositing SOL
    #[account(mut)]
    pub merchant: Signer<'info>,

    /// Protocol treasury - receives the deposited SOL
    /// CHECK: This is validated against platform_state
    #[account(
        mut,
        constraint = protocol_treasury.key() == platform_state.protocol_treasury @ LoyaltyError::InvalidTreasury
    )]
    pub protocol_treasury: AccountInfo<'info>,

    /// Platform state - for mint authority and ratio config
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

    /// Merchant's associated token account for loyalty tokens
    #[account(
        init_if_needed,
        payer = merchant,
        associated_token::mint = token_mint,
        associated_token::authority = merchant
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<DepositSol>,
    sol_amount: u64,
) -> Result<()> {
    require!(sol_amount > 0, LoyaltyError::InsufficientSolDeposit);

    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;

    // Calculate loyalty points based on ratio
    // sol_amount is in lamports (1 SOL = 1_000_000_000 lamports)
    // sol_to_points_ratio is points per SOL (e.g. 100)
    // token_decimals adjusts for token precision (e.g. 6 decimals)
    //
    // Formula: points = (sol_amount * ratio * 10^decimals) / LAMPORTS_PER_SOL
    let decimals_multiplier = 10u64.pow(platform_state.token_decimals as u32);
    let points_amount = sol_amount
        .checked_mul(platform_state.sol_to_points_ratio)
        .ok_or(LoyaltyError::ArithmeticOverflow)?
        .checked_mul(decimals_multiplier)
        .ok_or(LoyaltyError::ArithmeticOverflow)?
        .checked_div(anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    require!(points_amount > 0, LoyaltyError::InvalidAmount);

    // Check max supply
    let new_supply = platform_state
        .current_supply
        .checked_add(points_amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    require!(
        new_supply <= platform_state.max_supply,
        LoyaltyError::DepositExceedsMaxSupply
    );

    // STEP 1: Transfer SOL from merchant to protocol treasury
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.merchant.key(),
            &ctx.accounts.protocol_treasury.key(),
            sol_amount,
        ),
        &[
            ctx.accounts.merchant.to_account_info(),
            ctx.accounts.protocol_treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("Merchant deposited {} lamports to treasury", sol_amount);

    // STEP 2: Mint loyalty points to merchant's token account
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
                to: ctx.accounts.merchant_token_account.to_account_info(),
                authority: platform_state.to_account_info(),
            },
            signer_seeds,
        ),
        points_amount,
    )?;

    // Update state
    platform_state.current_supply = new_supply;

    merchant_record.total_minted = merchant_record
        .total_minted
        .checked_add(points_amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!(
        "Merchant {} deposited {} lamports ({} SOL), received {} loyalty points",
        ctx.accounts.merchant.key(),
        sol_amount,
        sol_amount as f64 / 1_000_000_000.0,
        points_amount
    );

    emit!(SolDeposited {
        merchant: ctx.accounts.merchant.key(),
        sol_amount,
        points_minted: points_amount,
        ratio: platform_state.sol_to_points_ratio,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct SolDeposited {
    pub merchant: Pubkey,
    pub sol_amount: u64,
    pub points_minted: u64,
    pub ratio: u64,
    pub timestamp: i64,
}
