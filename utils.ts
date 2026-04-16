/**
 * Calculate the size of a string in bytes (UTF-8 encoding)
 */
export function getContentSizeBytes(content: string): number {
  return new Blob([content]).size;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Detect if the user is on a mobile device
 * Uses touch capability, screen size, and user agent
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check screen size (mobile typically < 768px width)
  const isSmallScreen = window.innerWidth < 768;

  // Check user agent for mobile keywords
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Device is mobile if it has touch AND (small screen OR mobile user agent)
  return hasTouch && (isSmallScreen || mobileUserAgent);
}
