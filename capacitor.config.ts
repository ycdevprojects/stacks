import type { CapacitorConfig } from '@capacitor/cli';

// Native iOS/Android shells around the static build (see "Mobile app" in the README).
const config: CapacitorConfig = {
	// Permanent once the app is published to a store.
	appId: 'com.ycdevprojects.stackr',
	appName: 'Stackr',
	webDir: 'build',
	backgroundColor: '#020617',
	ios: {
		// The app lays itself out with env(safe-area-inset-*), like the installed web app.
		contentInset: 'never'
	},
	android: {
		backgroundColor: '#020617'
	}
};

export default config;
