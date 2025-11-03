import crypto from 'crypto';

/**
 * Provably Fair System
 * 
 * This ensures that market resolutions are fair and cannot be manipulated:
 * 1. Before a market resolves, a commitment hash is generated: hash(resolvedOutcome + secret)
 * 2. The hash is stored publicly (can be shown to users)
 * 3. After resolution, the secret is revealed, proving the outcome was determined fairly
 * 4. Anyone can verify: hash(resolvedOutcome + secret) === storedHash
 */

/**
 * Generate a commitment hash for a market resolution
 * Format: SHA256(resolvedOutcome + ":" + secret + ":" + marketId)
 */
export function generateCommitmentHash(
  resolvedOutcome: "yes" | "no" | "refunded",
  secret: string,
  marketId: number
): string {
  const message = `${resolvedOutcome}:${secret}:${marketId}`;
  return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Generate a random secret for commitment
 */
export function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify a commitment hash
 * Returns true if the hash matches the commitment
 */
export function verifyCommitmentHash(
  hash: string,
  resolvedOutcome: "yes" | "no" | "refunded",
  secret: string,
  marketId: number
): boolean {
  const expectedHash = generateCommitmentHash(resolvedOutcome, secret, marketId);
  return hash === expectedHash;
}

/**
 * Generate commitment hash for a bet (optional - for future use)
 * This can be used to prove a bet was placed before market resolution
 */
export function generateBetCommitment(
  betId: number,
  marketId: number,
  position: "yes" | "no",
  amount: string,
  secret: string
): string {
  const message = `${betId}:${marketId}:${position}:${amount}:${secret}`;
  return crypto.createHash('sha256').update(message).digest('hex');
}

