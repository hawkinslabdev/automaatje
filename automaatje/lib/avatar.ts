import { createAvatar } from '@dicebear/core';
import { thumbs } from '@dicebear/collection';

/**
 * Available avatar seeds for new users
 */
export const AVATAR_SEEDS = ['Aidan', 'Maria', 'Nolan', 'Mason', 'Sarah', 'Brian'] as const;

/**
 * Get a random avatar seed from the predefined list
 */
export function getRandomAvatarSeed(): string {
  return AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
}

/**
 * Generate an avatar SVG string for a given seed
 */
export function generateAvatarSvg(seed: string): string {
  const avatar = createAvatar(thumbs, {
    seed,
  });

  return avatar.toString();
}

/**
 * Generate a data URI for an avatar that can be used directly in img src
 */
export function generateAvatarDataUri(seed: string): string {
  const svg = generateAvatarSvg(seed);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get initials from a name (fallback for avatars)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AA';
}
