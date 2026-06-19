// Liferay Analytics Cloud tracking. Mirrors the AC config from the page set up
// for this app at /web/ac-world-cup-2026-bet (DEV SDK + internal publisher).
// The SDK loads once; pageViews and custom events are sent per client route.

const SDK_URL = 'https://analytics-js-dev-cdn.liferay.com';

const CONFIG = {
	dataSourceId: '820802606605225785',
	endpointUrl: 'https://osbasahpublisher-ac-internal.lfr.cloud',
	projectId: 'asah59dbaa580b264c578bb15c878dd363f0',
};

const CHANNEL_ID = '825006858418062047';

interface AnalyticsRequest {
	context: Record<string, unknown>;
}

interface AnalyticsSDK {
	create: (
		config: object,
		middlewares?: Array<(request: AnalyticsRequest) => AnalyticsRequest>
	) => void;
	send: (
		eventId: string,
		applicationId: string,
		properties?: Record<string, unknown>
	) => void;
	track: (eventId: string, properties?: Record<string, unknown>) => void;
}

declare global {
	interface Window {
		Analytics?: AnalyticsSDK;
	}
}

let started = false;
let ready = false;

// Calls made before the SDK finishes loading are queued (in order) and flushed
// on load, so nothing — including the first pageLoaded — is lost.
const pending: Array<() => void> = [];

function runOrQueue(fn: () => void): void {
	if (ready) {
		fn();
	}
	else {
		pending.push(fn);
	}
}

// Inject the AC SDK once and configure it. Call on app start.
export function initAnalyticsCloud(): void {
	if (started || typeof document === 'undefined') {
		return;
	}

	started = true;

	const script = document.createElement('script');

	script.async = true;
	script.src = SDK_URL;

	script.onload = () => {
		if (!window.Analytics) {
			return;
		}

		window.Analytics.create(CONFIG, [
			(request) => {
				request.context = request.context ?? {};
				request.context.channelId = CHANNEL_ID;
				request.context.canonicalUrl = window.location.href;

				return request;
			},
		]);

		ready = true;

		while (pending.length) {
			pending.shift()?.();
		}
	};

	document.head.appendChild(script);
}

// The standard AC page view for a client route.
export function acPageView(page: string, title?: string): void {
	runOrQueue(() =>
		window.Analytics?.send('pageViewed', 'Page', {
			page,
			...(title ? {title} : {}),
		})
	);
}

// A custom event — mirrors the GA custom events.
export function acTrack(
	eventId: string,
	properties?: Record<string, unknown>
): void {
	runOrQueue(() => window.Analytics?.track(eventId, properties));
}
