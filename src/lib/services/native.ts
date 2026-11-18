// Bridges to the native shells (Capacitor). Everything here falls back to the
// web behaviour, so screens call these without caring where they run.
// Plugins are imported lazily so the web bundle doesn't load native code.

import { Capacitor } from '@capacitor/core';

/** Running inside the iOS/Android app rather than a browser. */
export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/**
 * Hand a text file to the user: a download in the browser; in the app, the
 * system share sheet (Save to Files, AirDrop, Mail, Calendar…), since webviews
 * can't download files.
 */
export async function saveTextFile(contents: string, type: string, filename: string): Promise<void> {
	if (isNative()) {
		const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
			import('@capacitor/filesystem'),
			import('@capacitor/share')
		]);
		const { uri } = await Filesystem.writeFile({
			path: filename,
			data: contents,
			directory: Directory.Cache,
			encoding: Encoding.UTF8
		});
		await Share.share({ title: filename, files: [uri] });
		return;
	}
	const url = URL.createObjectURL(new Blob([contents], { type }));
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Native haptics; `ms` is mapped to a light/medium/heavy tap, a pattern to a success buzz. */
export function nativeHaptic(pattern: number | number[]): void {
	import('@capacitor/haptics')
		.then(({ Haptics, ImpactStyle, NotificationType }) => {
			if (Array.isArray(pattern)) return Haptics.notification({ type: NotificationType.Success });
			const style = pattern <= 6 ? ImpactStyle.Light : pattern <= 12 ? ImpactStyle.Medium : ImpactStyle.Heavy;
			return Haptics.impact({ style });
		})
		.catch(() => {});
}
