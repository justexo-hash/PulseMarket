import crypto from 'crypto';

/**
 * Generate a unique invite code for private wagers
 * Format: 8-character alphanumeric code (uppercase)
 */
export function generateInviteCode(): string {
  // Generate random bytes and convert to a hex string, then map to alphanumeric
  const bytes = crypto.randomBytes(6);
  const hex = bytes.toString('hex'); // Hex gives us 12 characters (a-f, 0-9)
  
  // Convert hex to base36-like string by using all alphanumeric characters
  // We'll use 0-9 and A-Z (36 characters total, similar to base36)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  // Convert hex pairs to base36-like values
  for (let i = 0; i < hex.length && code.length < 8; i += 2) {
    const hexPair = hex.substr(i, 2);
    const value = parseInt(hexPair, 16); // 0-255
    code += chars[value % chars.length];
  }
  
  // If we need more characters, fill with random from the charset
  while (code.length < 8) {
    const randomByte = crypto.randomBytes(1)[0];
    code += chars[randomByte % chars.length];
  }
  
  return code.slice(0, 8);
}

/**
 * Validate an invite code format
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

