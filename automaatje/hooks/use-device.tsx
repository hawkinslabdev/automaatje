import * as React from "react";
import { BREAKPOINTS } from "@/lib/constants/breakpoints";

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isMobileOrTablet: boolean;
  isTouchDevice: boolean;
  width: number;
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isMobileOrTablet: false,
    isTouchDevice: false,
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
  });

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const isMobile = width < BREAKPOINTS.mobile;
      const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop;
      const isDesktop = width >= BREAKPOINTS.desktop;
      const isMobileOrTablet = width < BREAKPOINTS.desktop;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isMobileOrTablet,
        isTouchDevice,
        width,
      });
    };

    // Initial update
    updateDeviceInfo();

    // Listen for resize events
    window.addEventListener("resize", updateDeviceInfo);

    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useDevice() instead
 */
export function useIsMobile(): boolean {
  const { isMobileOrTablet } = useDevice();
  return isMobileOrTablet;
}
