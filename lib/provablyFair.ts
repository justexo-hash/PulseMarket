/**
 * Client-side provably fair verification utilities
 */

/**
 * Verify a commitment hash on the client side
 * Format: SHA256(outcome:secret:marketId)
 */
export async function verifyCommitmentHash(
  outcome: "yes" | "no" | "refunded",
  secret: string,
  marketId: number,
  expectedHash: string
): Promise<boolean> {
  const message = `${outcome}:${secret}:${marketId}`;
  
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === expectedHash.toLowerCase();
}

/**
 * Format commitment info for display
 */
export function formatCommitmentInfo(
  outcome: "yes" | "no" | "refunded" | null,
  secret: string | null,
  marketId: number
): string {
  if (!outcome || !secret) return "";
  return `${outcome}:${secret}:${marketId}`;
}

