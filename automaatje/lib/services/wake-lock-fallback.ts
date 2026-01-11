/**
 * Wake Lock Fallback Service
 * Voor browsers zonder Wake Lock API: gebruik video trick
 * (speelt onzichtbare video af om scherm wakker te houden)
 */

export class WakeLockFallback {
  private video: HTMLVideoElement | null = null;

  async acquire(): Promise<boolean> {
    // Guard: only run in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('Wake Lock fallback only available in browser');
      return false;
    }

    try {
      // Maak onzichtbare video element
      this.video = document.createElement('video');
      this.video.style.position = 'fixed';
      this.video.style.opacity = '0';
      this.video.style.pointerEvents = 'none';
      this.video.style.width = '1px';
      this.video.style.height = '1px';

      // Gebruik een 1x1 pixel video loop
      // Note: We'll need to create a very small looping video file
      this.video.src = '/wake-lock-video.mp4';
      this.video.loop = true;
      this.video.muted = true;
      this.video.playsInline = true;

      document.body.appendChild(this.video);
      await this.video.play();

      console.log('Wake Lock fallback actief (video method)');
      return true;
    } catch (err) {
      console.error('Wake Lock fallback mislukt:', err);
      return false;
    }
  }

  async release(): Promise<void> {
    if (this.video) {
      this.video.pause();
      this.video.remove();
      this.video = null;
      console.log('Wake Lock fallback uitgeschakeld');
    }
  }

  isActive(): boolean {
    return this.video !== null && !this.video.paused;
  }
}
