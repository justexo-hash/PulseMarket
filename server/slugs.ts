/**
 * Generate a URL-friendly slug from market question
 * Format: lowercase-title-with-hyphens-id{randomNum}
 * Example: "trump-2024-id5252643646"
 */
export function generateSlug(question: string, marketId: number): string {
  // Convert to lowercase, remove special chars, replace spaces with hyphens
  let slug = question
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Limit slug length (keep it reasonable)
  if (slug.length > 50) {
    slug = slug.slice(0, 50);
  }

  // Generate a random ID suffix for uniqueness
  const randomId = Math.floor(Math.random() * 1000000000).toString();
  
  return `${slug}-id${randomId}`;
}

/**
 * Extract market ID from slug or return slug as-is if it's an invite code
 */
export function extractIdentifier(identifier: string): { type: 'slug' | 'inviteCode'; value: string; marketId?: number } {
  // Check if it's an invite code (8 uppercase alphanumeric)
  if (/^[A-Z0-9]{8}$/.test(identifier)) {
    return { type: 'inviteCode', value: identifier };
  }

  // Try to extract ID from slug pattern: something-id{number}
  const idMatch = identifier.match(/-id(\d+)$/);
  if (idMatch) {
    const marketId = parseInt(idMatch[1], 10);
    if (!isNaN(marketId)) {
      return { type: 'slug', value: identifier, marketId };
    }
  }

  // Fallback: treat as slug
  return { type: 'slug', value: identifier };
}

