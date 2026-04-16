/**
 * Register service worker for PWA offline support
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported');
    return;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Check for updates periodically
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('New version available! Please refresh.');

          // Optionally show a notification to the user
          if (window.confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        }
      });
    });

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

/**
 * Unregister service worker (useful for development/testing)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service workers unregistered');
  }
}
