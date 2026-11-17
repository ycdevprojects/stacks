// Service worker registration (production builds only — in dev it would cache stale modules).

export function registerServiceWorker(): void {
	if (!('serviceWorker' in navigator)) return;
	navigator.serviceWorker
		.register('/service-worker.js', { scope: '/' })
		.then((registration) => {
			// Look for a new version whenever the app comes back to the foreground.
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') registration.update().catch(() => {});
			});
		})
		.catch((error) => console.error('Service worker registration failed:', error));
}
