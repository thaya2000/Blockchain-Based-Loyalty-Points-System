use anchor_lang::prelude::*;

#[error_code]
pub enum LoyaltyError {
    #[msg("Only the platform admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Merchant is not authorized to mint points")]
    UnauthorizedMerchant,

    #[msg("Merchant has already been registered")]
    MerchantAlreadyRegistered,

    #[msg("Merchant is not registered")]
    MerchantNotRegistered,

    #[msg("Insufficient loyalty points balance")]
    InsufficientBalance,

    #[msg("Mint amount exceeds merchant's allowance")]
    ExceedsMintAllowance,

    #[msg("Minting would exceed maximum token supply")]
    ExceedsMaxSupply,

    #[msg("Platform is not active")]
    PlatformInactive,

    #[msg("Invalid token amount - must be greater than zero")]
    InvalidAmount,

    #[msg("Invalid decimals value - must be between 0 and 9")]
    InvalidDecimals,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Reference string too long - max 64 characters")]
    ReferenceTooLong,
}
