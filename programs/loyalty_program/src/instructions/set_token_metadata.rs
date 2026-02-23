use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    sysvar,
};
use anchor_spl::token::Mint;
use std::str::FromStr;

use crate::errors::LoyaltyError;
use crate::state::PlatformState;

#[derive(Accounts)]
pub struct SetTokenMetadata<'info> {
    /// Admin who initialized the platform
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Platform state — used as the mint authority signer
    #[account(
        mut,
        seeds = [PlatformState::SEED],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ LoyaltyError::UnauthorizedAdmin,
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// The loyalty token mint
    #[account(
        mut,
        seeds = [b"loyalty_mint"],
        bump,
    )]
    pub token_mint: Account<'info, Mint>,

    /// Metaplex metadata account PDA
    /// Derived as: ["metadata", MPL_TOKEN_METADATA_ID, token_mint]
    /// CHECK: Created and validated by Metaplex program
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// Metaplex Token Metadata program
    /// CHECK: Key validated at runtime in handler
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Rent sysvar
    #[account(address = sysvar::rent::ID)]
    pub rent: UncheckedAccount<'info>,
}

/// Borsh-encode a Rust &str as a Metaplex/Borsh String (u32 LE length prefix + UTF-8 bytes)
fn borsh_string(s: &str) -> Vec<u8> {
    let bytes = s.as_bytes();
    let mut out = (bytes.len() as u32).to_le_bytes().to_vec();
    out.extend_from_slice(bytes);
    out
}

pub fn handler(
    ctx: Context<SetTokenMetadata>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    // Validate Metaplex program ID at runtime
    let mpl_id = Pubkey::from_str("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
        .map_err(|_| LoyaltyError::InvalidTreasury)?;
    require_keys_eq!(
        ctx.accounts.token_metadata_program.key(),
        mpl_id,
        LoyaltyError::InvalidTreasury
    );

    // Build CreateMetadataAccountsV3 instruction data (Borsh)
    // Discriminant: 33
    // Payload:
    //   DataV2 { name, symbol, uri, seller_fee_basis_points=0, creators=None,
    //            collection=None, uses=None }
    //   is_mutable: true
    //   collection_details: None
    let mut data: Vec<u8> = vec![33u8]; // instruction discriminant
    data.extend(borsh_string(&name));
    data.extend(borsh_string(&symbol));
    data.extend(borsh_string(&uri));
    data.extend_from_slice(&0u16.to_le_bytes()); // seller_fee_basis_points
    data.push(0u8); // creators: None
    data.push(0u8); // collection: None
    data.push(0u8); // uses: None
    data.push(1u8); // is_mutable: true
    data.push(0u8); // collection_details: None

    let ix = Instruction {
        program_id: mpl_id,
        accounts: vec![
            AccountMeta::new(*ctx.accounts.metadata_account.key, false),    // metadata (mut)
            AccountMeta::new_readonly(ctx.accounts.token_mint.key(), false), // mint
            AccountMeta::new_readonly(ctx.accounts.platform_state.key(), true), // mint_authority (signer via PDA)
            AccountMeta::new(ctx.accounts.admin.key(), true),               // payer (mut, signer)
            AccountMeta::new_readonly(ctx.accounts.admin.key(), true),      // update_authority (signer)
            AccountMeta::new_readonly(*ctx.accounts.system_program.key, false),
            AccountMeta::new_readonly(*ctx.accounts.rent.key, false),
        ],
        data,
    };

    let platform_state = &ctx.accounts.platform_state;
    let seeds = &[PlatformState::SEED, &[platform_state.bump]];
    let signer_seeds = &[&seeds[..]];

    invoke_signed(
        &ix,
        &[
            ctx.accounts.metadata_account.to_account_info(),
            ctx.accounts.token_mint.to_account_info(),
            ctx.accounts.platform_state.to_account_info(), // mint_authority
            ctx.accounts.admin.to_account_info(),          // payer
            ctx.accounts.admin.to_account_info(),          // update_authority
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer_seeds,
    )?;

    msg!("Token metadata set: name={}, symbol={}, uri={}", name, symbol, uri);
    Ok(())
}
