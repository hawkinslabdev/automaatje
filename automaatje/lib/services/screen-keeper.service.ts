/**
 * Screen Keeper Service
 * Unified service voor het wakker houden van het scherm
 * Probeert eerst Wake Lock API, valt terug naar video method indien nodig
 */

import { WakeLockService } from './wake-lock.service';
import { WakeLockFallback } from './wake-lock-fallback';

class ScreenKeeperService {
  private primaryService: WakeLockService;
  private fallbackService: WakeLockFallback;
  private usingFallback = false;

  constructor() {
    this.primaryService = new WakeLockService();
    this.fallbackService = new WakeLockFallback();
  }

  /**
   * Houd scherm wakker - probeert Wake Lock API eerst, valt terug naar video
   */
  async keepScreenOn(): Promise<boolean> {
    // Probeer eerst Wake Lock API
    const success = await this.primaryService.acquire();

    if (success) {
      this.usingFallback = false;
      return true;
    }

    // Fallback naar video method
    console.log('Falling back to video method');
    this.usingFallback = true;
    return await this.fallbackService.acquire();
  }

  /**
   * Sta toe dat scherm uitgaat
   */
  async allowScreenOff(): Promise<void> {
    if (this.usingFallback) {
      await this.fallbackService.release();
    } else {
      await this.primaryService.release();
    }
    this.usingFallback = false;
  }

  /**
   * Check of scherm wakker wordt gehouden
   */
  isActive(): boolean {
    if (this.usingFallback) {
      return this.fallbackService.isActive();
    }
    return this.primaryService.isActive();
  }

  /**
   * Handle visibility change (voor wake lock re-acquire)
   */
  async handleVisibilityChange(): Promise<void> {
    if (!this.usingFallback) {
      await this.primaryService.handleVisibilityChange();
    }
  }

  /**
   * Check of Wake Lock API beschikbaar is
   */
  isWakeLockSupported(): boolean {
    return 'wakeLock' in navigator;
  }
}

// Singleton instance
export const screenKeeper = new ScreenKeeperService();
