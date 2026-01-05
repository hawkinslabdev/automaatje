"use client";

import { useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/actions/notifications";

/**
 * Hook to get unread notification count with automatic polling
 * @param pollInterval - How often to check for updates (ms), default 30 seconds
 */
export function useUnreadCount(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch immediately on mount
    const fetchCount = async () => {
      const result = await getUnreadCount();
      if (result.success && result.data !== undefined) {
        setUnreadCount(result.data);
      } else {
        console.error("Failed to fetch unread count:", result.error);
      }
    };

    fetchCount();

    // Set up polling interval
    const interval = setInterval(fetchCount, pollInterval);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [pollInterval]);

  return unreadCount;
}
