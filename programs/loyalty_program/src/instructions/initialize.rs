use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::errors::LoyaltyError;
use crate::state::PlatformState;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    /// The admin who will control the platform
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Protocol treasury for collecting fees
    /// CHECK: This is the treasury wallet address
    pub protocol_treasury: AccountInfo<'info>,

    /// Platform state PDA - stores global config
    #[account(
        init,
        payer = admin,
        space = 8 + PlatformState::INIT_SPACE,
        seeds = [PlatformState::SEED],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// The SPL token mint for loyalty points
    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = platform_state,
        mint::freeze_authority = platform_state,
        seeds = [b"loyalty_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    token_decimals: u8,
    max_supply: u64,
    base_mint_fee: u64,
    fee_rate_per_thousand: u64,
) -> Result<()> {
    require!(
        token_decimals <= 9,
        LoyaltyError::InvalidDecimals
    );

    let platform_state = &mut ctx.accounts.platform_state;

    platform_state.admin = ctx.accounts.admin.key();
    platform_state.token_mint = ctx.accounts.token_mint.key();
    platform_state.protocol_treasury = ctx.accounts.protocol_treasury.key();
    platform_state.max_supply = max_supply;
    platform_state.current_supply = 0;
    platform_state.token_decimals = token_decimals;
    platform_state.merchant_count = 0;
    platform_state.is_active = true;
    platform_state.base_mint_fee = base_mint_fee;
    platform_state.fee_rate_per_thousand = fee_rate_per_thousand;
    platform_state.total_fees_collected = 0;
    platform_state.bump = ctx.bumps.platform_state;

    msg!(
        "Platform initialized by admin: {}",
        ctx.accounts.admin.key()
    );
    msg!("Token mint created: {}", ctx.accounts.token_mint.key());
    msg!("Protocol treasury: {}", ctx.accounts.protocol_treasury.key());
    msg!("Max supply: {}, Decimals: {}", max_supply, token_decimals);
    msg!("Base mint fee: {} lamports", base_mint_fee);
    msg!("Fee rate: {} lamports per 1000 points", fee_rate_per_thousand);

    emit!(PlatformInitialized {
        admin: ctx.accounts.admin.key(),
        token_mint: ctx.accounts.token_mint.key(),
        protocol_treasury: ctx.accounts.protocol_treasury.key(),
        max_supply,
        token_decimals,
        base_mint_fee,
        fee_rate_per_thousand,
    });

    Ok(())
}

#[event]
pub struct PlatformInitialized {
    pub admin: Pubkey,
    pub token_mint: Pubkey,
    pub protocol_treasury: Pubkey,
    pub max_supply: u64,
    pub token_decimals: u8,
    pub base_mint_fee: u64,
    pub fee_rate_per_thousand: u64,
}
