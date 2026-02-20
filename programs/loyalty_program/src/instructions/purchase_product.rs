use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::errors::LoyaltyError;
use crate::state::{MerchantRecord, PlatformState, PurchaseRecord};

#[derive(Accounts)]
#[instruction(product_id_hash: [u8; 32], price_sol: u64, loyalty_points_reward: u64, nonce: u64)]
pub struct PurchaseProductWithSol<'info> {
    /// The customer making the purchase
    #[account(mut)]
    pub customer: Signer<'info>,

    /// The merchant's wallet (receives SOL payment)
    /// CHECK: This is the merchant's wallet address
    #[account(mut)]
    pub merchant: AccountInfo<'info>,

    /// Protocol treasury - receives minting fees
    /// CHECK: This is validated against platform_state
    #[account(
        mut,
        constraint = protocol_treasury.key() == platform_state.protocol_treasury @ LoyaltyError::InvalidTreasury
    )]
    pub protocol_treasury: AccountInfo<'info>,

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

    /// Purchase record PDA - nonce allows same customer to buy same product multiple times
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

    /// The loyalty token mint
    #[account(
        mut,
        seeds = [b"loyalty_mint"],
        bump
    )]
    pub token_mint: Account<'info, Mint>,

    /// Customer's associated token account for loyalty tokens
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
    ctx: Context<PurchaseProductWithSol>,
    product_id_hash: [u8; 32],
    price_sol: u64,
    loyalty_points_reward: u64,
    _nonce: u64,
) -> Result<()> {
    require!(price_sol > 0, LoyaltyError::InvalidAmount);
    require!(loyalty_points_reward > 0, LoyaltyError::InvalidAmount);

    let platform_state = &mut ctx.accounts.platform_state;
    let merchant_record = &mut ctx.accounts.merchant_record;

    // STEP 1: Customer pays SOL to merchant
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.customer.key(),
            &ctx.accounts.merchant.key(),
            price_sol,
        ),
        &[
            ctx.accounts.customer.to_account_info(),
            ctx.accounts.merchant.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("Customer paid {} lamports to merchant", price_sol);

    // STEP 2: Calculate and pay protocol fee for minting loyalty points
    let base_fee = platform_state.base_mint_fee;
    let rate = platform_state.fee_rate_per_thousand;
    let points_in_thousands = (loyalty_points_reward + 999) / 1000;
    let variable_fee = points_in_thousands.checked_mul(rate)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;
    let total_fee = base_fee.checked_add(variable_fee)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    // Fee is paid by the customer (who is the signer), not the merchant
    if total_fee > 0 {
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.customer.key(),
                &ctx.accounts.protocol_treasury.key(),
                total_fee,
            ),
            &[
                ctx.accounts.customer.to_account_info(),
                ctx.accounts.protocol_treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    msg!("Customer paid protocol fee: {} lamports", total_fee);

    // STEP 3: Mint loyalty points to customer
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
                to: ctx.accounts.customer_token_account.to_account_info(),
                authority: platform_state.to_account_info(),
            },
            signer_seeds,
        ),
        loyalty_points_reward,
    )?;

    // Update records
    let purchase_record = &mut ctx.accounts.purchase_record;
    purchase_record.customer = ctx.accounts.customer.key();
    purchase_record.merchant = ctx.accounts.merchant.key();
    purchase_record.product_id_hash = product_id_hash;
    purchase_record.payment_type = 0; // 0 = SOL
    purchase_record.amount_paid = price_sol;
    purchase_record.points_earned = loyalty_points_reward;
    purchase_record.purchased_at = Clock::get()?.unix_timestamp;
    purchase_record.bump = ctx.bumps.purchase_record;

    platform_state.current_supply = platform_state.current_supply
        .checked_add(loyalty_points_reward)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;
    
    platform_state.total_fees_collected = platform_state.total_fees_collected
        .checked_add(total_fee)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    merchant_record.total_minted = merchant_record.total_minted
        .checked_add(loyalty_points_reward)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;
    
    merchant_record.total_fees_paid = merchant_record.total_fees_paid
        .checked_add(total_fee)
        .ok_or(LoyaltyError::ArithmeticOverflow)?;

    msg!(
        "Product purchased: customer={}, merchant={}, product_hash={:?}, price={} SOL, earned={} points",
        ctx.accounts.customer.key(),
        ctx.accounts.merchant.key(),
        &product_id_hash[..8],
        price_sol,
        loyalty_points_reward
    );

    emit!(ProductPurchased {
        customer: ctx.accounts.customer.key(),
        merchant: ctx.accounts.merchant.key(),
        product_id_hash,
        payment_type: 0,
        amount_paid: price_sol,
        points_earned: loyalty_points_reward,
        fee_paid: total_fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ProductPurchased {
    pub customer: Pubkey,
    pub merchant: Pubkey,
    pub product_id_hash: [u8; 32],
    pub payment_type: u8,
    pub amount_paid: u64,
    pub points_earned: u64,
    pub fee_paid: u64,
    pub timestamp: i64,
}
