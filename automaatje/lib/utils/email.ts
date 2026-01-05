/**
 * Email normalization utilities
 * Ensures consistent email storage and comparison
 */

/**
 * Normalize an email address for storage and comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes dots in Gmail addresses (user.name@gmail.com === username@gmail.com)
 * - Removes plus addressing (user+tag@example.com === user@example.com)
 * 
 * @param email - Raw email address
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  // Trim and convert to lowercase
  const trimmed = email.trim().toLowerCase();
  
  // Split into local and domain parts
  const [localPart, domain] = trimmed.split('@');
  
  if (!localPart || !domain) {
    // Invalid email format, return as-is
    return trimmed;
  }
  
  let normalizedLocal = localPart;
  
  // Remove plus addressing (everything after +)
  const plusIndex = normalizedLocal.indexOf('+');
  if (plusIndex !== -1) {
    normalizedLocal = normalizedLocal.substring(0, plusIndex);
  }
  
  // For Gmail addresses, remove all dots from local part
  // Gmail treats user.name@gmail.com and username@gmail.com as identical
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    normalizedLocal = normalizedLocal.replace(/\./g, '');
  }
  
  return `${normalizedLocal}@${domain}`;
}
