/**
 * Wake Lock Service
 * Prevents screen from turning off during GPS tracking
 *
 * Browser Support:
 * - Chrome/Edge (Android): Full support
 * - Safari (iOS 16.4+): Supported since iOS 16.4
 * - Firefox: Experimental (fallback needed)
 */

export class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;

  /**
   * Activeer wake lock (scherm blijft aan)
   */
  async acquire(): Promise<boolean> {
    // Guard: only run in browser
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.warn('Wake Lock only available in browser');
      return false;
    }

    // Check support
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API niet ondersteund');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');

      console.log('Wake Lock actief: scherm blijft aan');

      // Re-acquire bij visibility change (gebruiker switcht tussen apps)
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake Lock vrijgegeven');
      });

      return true;
    } catch (err) {
      console.error('Wake Lock activeren mislukt:', err);
      return false;
    }
  }

  /**
   * Deactiveer wake lock (scherm kan uitgaan)
   */
  async release(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake Lock uitgeschakeld');
    }
  }

  /**
   * Check of wake lock actief is
   */
  isActive(): boolean {
    return this.wakeLock !== null && !this.wakeLock.released;
  }

  /**
   * Re-acquire na visibility change
   */
  async handleVisibilityChange(): Promise<void> {
    if (document.visibilityState === 'visible' && this.wakeLock?.released) {
      await this.acquire();
    }
  }
}

// Singleton instance
export const wakeLockService = new WakeLockService();
