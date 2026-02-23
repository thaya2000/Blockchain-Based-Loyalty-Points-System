/**
 * Loyalty Point (LP) Formatting Utilities
 * 
 * LP tokens have 6 decimal places (like SOL lamports)
 * - On-chain storage: 500,000,000 (minimal units)
 * - User display: 500 LP
 */

const LP_SCALE = 1_000_000; // 6 decimal places

/**
 * Convert raw on-chain LP amount to user-facing display value
 * @param rawAmount - Amount in smallest units (e.g., 500000000)
 * @returns Display amount (e.g., 500)
 */
export function formatLoyaltyPoints(rawAmount: number): string {
  const displayAmount = rawAmount / LP_SCALE;
  return displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Convert user input LP to on-chain storage format
 * @param displayAmount - User-facing amount (e.g., 500)
 * @returns On-chain amount (e.g., 500000000)
 */
export function getLPInSmallestUnit(displayAmount: number): number {
  return Math.floor(displayAmount * LP_SCALE);
}

export const LP_DISPLAY_DECIMALS = 2;
export { LP_SCALE };
