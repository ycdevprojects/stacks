// Service worker for the Stackr PWA. Built separately (`npm run build:sw`)
// into static/service-worker.js. Network-first for pages, cache-first for
// static assets (Vite hashes their filenames).

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE = 'stackr-v3';

const SHELL = ['/', '/stacks', '/stats', '/room'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(SHELL))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (request.method !== 'GET') return;

	if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() =>
					caches.match(request).then((cached) => cached ?? caches.match('/') as Promise<Response>)
				)
		);
		return;
	}

	if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => {
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, clone));
					return response;
				});
			})
		);
		return;
	}

	event.respondWith(
		fetch(request)
			.then((response) => {
				const clone = response.clone();
				caches.open(CACHE).then((cache) => cache.put(request, clone));
				return response;
			})
			.catch(() => caches.match(request) as Promise<Response>)
	);
});

// Reminder tapped: focus an open Stackr window, or open one.
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = (event.notification.data as { url?: string } | null)?.url ?? '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			const open = clients.find((c) => new URL(c.url).origin === self.location.origin);
			if (open) return open.focus().then(() => open.navigate(url)).then(() => undefined);
			return self.clients.openWindow(url).then(() => undefined);
		})
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

export {};