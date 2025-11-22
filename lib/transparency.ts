/**
 * Transparency utilities for displaying on-chain transaction verification
 */

/**
 * Extract transaction signature from description if not in txSignature field
 * Format: "Description (Tx: <signature>)"
 */
export function extractTxSignature(
  description?: string | null,
  txSignature?: string | null
): string | null {
  if (txSignature) return txSignature;
  if (!description) return null;
  
  // Try to extract from description format: "... (Tx: <signature>)"
  const match = description.match(/\(Tx: ([a-zA-Z0-9]{64,})\)/);
  return match ? match[1] : null;
}

/**
 * Generate Solscan URL for a transaction signature
 */
function getNetworkParam() {
  const network =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
    process.env.SOLANA_NETWORK ||
    "mainnet-beta";
  return network === "mainnet-beta" ? "" : `?cluster=${network}`;
}

export function getSolscanUrl(signature: string): string {
  const cluster = getNetworkParam();
  return `https://solscan.io/tx/${signature}${cluster}`;
}

/**
 * Generate Solscan URL for an address
 */
export function getSolscanAddressUrl(address: string): string {
  const cluster = getNetworkParam();
  return `https://solscan.io/account/${address}${cluster}`;
}

/**
 * Truncate signature for display
 */
export function truncateSignature(signature: string, start: number = 8, end: number = 8): string {
  if (signature.length <= start + end) return signature;
  return `${signature.slice(0, start)}...${signature.slice(-end)}`;
}

