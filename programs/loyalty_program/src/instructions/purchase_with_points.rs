use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState, PurchaseRecord};

#[derive(Accounts)]
#[instruction(product_id_hash: [u8; 32], points_amount: u64, nonce: u64)]
pub struct PurchaseProductWithPoints<'info> {
    /// The customer making the purchase with loyalty points
    #[account(mut)]
    pub customer: Signer<'info>,

    /// The merchant's wallet
    /// CHECK: This is the merchant's wallet address
    #[account(mut)]
    pub merchant: AccountInfo<'info>,

    /// Platform state
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.is_active @ LoyaltyError::PlatformInactive
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// Merchant record
    #[account(
        mut,
        seeds = [MerchantRecord::SEED, merchant.key().as_ref()],
        bump = merchant_record.bump,
        constraint = merchant_record.is_authorized @ LoyaltyError::UnauthorizedMerchant
    )]
    pub merchant_record: Account<'info, MerchantRecord>,

    /// Purchase record PDA - nonce allows same customer to redeem same product multiple times
    #[account(
        init,
        payer = customer,
        space = 8 + PurchaseRecord::INIT_SPACE,
        seeds = [
            PurchaseRecord::SEED,
            customer.key().as_ref(),
            &product_id_hash,
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub purchase_record: Account<'info, PurchaseRecord>,

    /// The loyalty token mint (mut because we burn tokens)
    #[account(
        mut,
        seeds = [b"loyalty_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// Customer's token account for loyalty tokens
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = customer
    )]
    pub customer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PurchaseProductWithPoints>,
    product_id_hash: [u8; 32],
    points_amount: u64,
    _nonce: u64,
) -> Result<()> {
    require!(points_amount > 0, LoyaltyError::InvalidAmount);

    // Check customer has enough points
    let customer_balance = ctx.accounts.customer_token_account.amount;
    require!(
        customer_balance >= points_amount,
        LoyaltyError::InsufficientPointsBalance
    );

    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;

    // STEP 1: Burn loyalty points from customer's account
    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.customer_token_account.to_account_info(),
                authority: ctx.accounts.customer.to_account_info(),
            },
        ),
        points_amount,
    )?;

    msg!("Burned {} loyalty points from customer", points_amount / 1_000_000);

    // STEP 2: Record the purchase
    let purchase_record = &mut ctx.accounts.purchase_record;
    purchase_record.customer = ctx.accounts.customer.key();
    purchase_record.merchant = ctx.accounts.merchant.key();
    purchase_record.product_id_hash = product_id_hash;
    purchase_record.payment_type = 1; // 1 = Loyalty Points
    purchase_record.amount_paid = points_amount;
    purchase_record.points_earned = 0; // No points earned when paying with points
    purchase_record.purchased_at = Clock::get()?.unix_timestamp;
    purchase_record.bump = ctx.bumps.purchase_record;

    // Update state - reduce total supply since tokens are burned
    platform_state.current_supply = platform_state
        .current_supply
        .checked_sub(points_amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    merchant_record.total_redeemed = merchant_record
        .total_redeemed
        .checked_add(points_amount)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!(
        "Product purchased with points: customer={}, merchant={}, product_hash={:?}, points_spent={}",
        ctx.accounts.customer.key(),
        ctx.accounts.merchant.key(),
        &product_id_hash[..8],
        points_amount
    );

    emit!(ProductPurchasedWithPoints {
        customer: ctx.accounts.customer.key(),
        merchant: ctx.accounts.merchant.key(),
        product_id_hash,
        points_spent: points_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ProductPurchasedWithPoints {
    pub customer: Pubkey,
    pub merchant: Pubkey,
    pub product_id_hash: [u8; 32],
    pub points_spent: u64,
    pub timestamp: i64,
}
