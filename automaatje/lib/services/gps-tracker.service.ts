/**
 * GPS Tracker Service
 * Tracks user location using the Geolocation API
 * Calculates distances using Haversine formula
 */

export interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null; // m/s
  heading: number | null; // degrees
  timestamp: number; // Unix ms
}

export class GPSTrackerService {
  private watchId: number | null = null;
  private points: GPSPoint[] = [];
  private onUpdate: ((point: GPSPoint) => void) | null = null;
  private onError: ((error: GeolocationPositionError) => void) | null = null;

  /**
   * Start GPS tracking (foreground only)
   */
  start(
    onUpdate: (point: GPSPoint) => void,
    onError: (error: GeolocationPositionError) => void
  ): void {
    // Guard: only run in browser
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.error('GPS tracking only available in browser');
      return;
    }

    if (this.watchId !== null) {
      console.warn('GPS tracking al actief');
      return;
    }

    this.onUpdate = onUpdate;
    this.onError = onError;
    this.points = [];

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: GPSPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed, // m/s, kan null zijn
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };

        this.points.push(point);
        this.onUpdate?.(point);
      },
      (error) => {
        console.error('GPS error:', error);
        this.onError?.(error);
      },
      {
        enableHighAccuracy: true, // Gebruik GPS, niet WiFi triangulation
        maximumAge: 5000, // Max 5 seconden oude positie
        timeout: 10000, // 10 seconden timeout
      }
    );

    console.log('GPS tracking gestart');
  }

  /**
   * Stop GPS tracking
   */
  stop(): GPSPoint[] {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('GPS tracking gestopt');
    }

    const finalPoints = [...this.points];
    this.points = [];
    return finalPoints;
  }

  /**
   * Get alle opgenomen punten
   */
  getPoints(): GPSPoint[] {
    return [...this.points];
  }

  /**
   * Load points from database (for resume)
   */
  loadPoints(points: GPSPoint[]): void {
    this.points = [...points];
    console.log(`Loaded ${points.length} GPS points from database`);
  }

  /**
   * Get new points since last save
   */
  getNewPoints(sinceTimestamp: number): GPSPoint[] {
    return this.points.filter((p) => p.timestamp > sinceTimestamp);
  }

  /**
   * Get huidige totale afstand (Haversine)
   */
  getTotalDistance(): number {
    if (this.points.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      total += this.haversineDistance(this.points[i - 1], this.points[i]);
    }

    return total; // km
  }

  /**
   * Haversine afstand tussen twee punten (in km)
   */
  private haversineDistance(p1: GPSPoint, p2: GPSPoint): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(p2.latitude - p1.latitude);
    const dLon = this.toRad(p2.longitude - p1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(p1.latitude)) *
        Math.cos(this.toRad(p2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert graden naar radialen
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check of tracking actief is
   */
  isTracking(): boolean {
    return this.watchId !== null;
  }

  /**
   * Get het laatste GPS punt
   */
  getLastPoint(): GPSPoint | null {
    if (this.points.length === 0) return null;
    return this.points[this.points.length - 1];
  }

  /**
   * Converteer punten naar GeoJSON LineString
   */
  toGeoJSON(): string {
    const coordinates = this.points.map((p) => [p.longitude, p.latitude]);

    return JSON.stringify({
      type: 'LineString',
      coordinates,
    });
  }
}

// Singleton instance
export const gpsTracker = new GPSTrackerService();
