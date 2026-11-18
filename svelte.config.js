import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// ADAPTER picks the build target:
//   (unset)  Vercel — the hosted web app
//   node     a local Node server — used by the e2e tests
//   static   plain files in build/ — the iOS/Android apps (Capacitor)
const target = process.env.ADAPTER ?? 'vercel';
const adapterName = {
	vercel: '@sveltejs/adapter-vercel',
	node: '@sveltejs/adapter-node',
	static: '@sveltejs/adapter-static'
}[target];
if (!adapterName) throw new Error(`Unknown ADAPTER "${target}" (use vercel, node or static)`);
const adapter = (await import(adapterName)).default;

const options = {
	vercel: { runtime: 'nodejs22.x' },
	node: {},
	// Single-page app: every route falls back to index.html and renders on the device.
	static: { pages: 'build', assets: 'build', fallback: 'index.html', strict: false }
}[target];

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(options)
	}
};

export default config;
