"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/avatar";

interface UserAvatarProps {
  name: string;
  avatarSeed?: string;
  className?: string;
}

export function UserAvatar({ name, avatarSeed, className }: UserAvatarProps) {
  // Generate avatar URL from seed
  const avatarUrl = avatarSeed
    ? `/api/avatar/${encodeURIComponent(avatarSeed)}`
    : undefined;

  return (
    <Avatar className={className}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={`${name}'s avatar`} />
      )}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}
