// Fire a GA4 custom event through the gtag snippet in index.html. No-op when
// gtag is absent (ad blockers, or before the tag loads), so callers never need
// to guard.
type Gtag = (
	command: 'event',
	eventName: string,
	params?: Record<string, unknown>
) => void;

export function trackEvent(
	name: string,
	params?: Record<string, unknown>
): void {
	const gtag = (window as unknown as {gtag?: Gtag}).gtag;

	gtag?.('event', name, params);
}
