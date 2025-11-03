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
export function getSolscanUrl(signature: string): string {
  const network = import.meta.env.VITE_SOLANA_NETWORK === "mainnet-beta" ? "" : "devnet.";
  return `https://solscan.io/tx/${signature}${network ? `?cluster=${network}` : ""}`;
}

/**
 * Generate Solscan URL for an address
 */
export function getSolscanAddressUrl(address: string): string {
  const network = import.meta.env.VITE_SOLANA_NETWORK === "mainnet-beta" ? "" : "devnet.";
  return `https://solscan.io/account/${address}${network ? `?cluster=${network}` : ""}`;
}

/**
 * Truncate signature for display
 */
export function truncateSignature(signature: string, start: number = 8, end: number = 8): string {
  if (signature.length <= start + end) return signature;
  return `${signature.slice(0, start)}...${signature.slice(-end)}`;
}

