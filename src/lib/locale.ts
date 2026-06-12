export type Locale = 'en' | 'es' | 'pt';

export const LOCALES: Locale[] = ['en', 'pt', 'es'];

export type Localized = Record<Locale, string>;

// Browser language wins, but a ?lang= query param overrides it (handy for
// sharing a link in a specific language, and for previewing).
export function detectLocale(): Locale {
	const override = new URLSearchParams(window.location.search)
		.get('lang')
		?.toLowerCase();

	const lang = (override || navigator.language || 'en').toLowerCase();

	if (lang.startsWith('pt')) {
		return 'pt';
	}

	if (lang.startsWith('es')) {
		return 'es';
	}

	return 'en';
}

export function localize(
	value: Partial<Localized> | undefined,
	locale: Locale
): string | undefined {
	return value?.[locale] ?? value?.en;
}

// Defensive: leaderboard commentary must be emoji-free, even if an older
// cached commentary.json still carries them.
export function stripEmoji(text: string): string {
	return text
		.replace(/\p{Extended_Pictographic}/gu, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}
