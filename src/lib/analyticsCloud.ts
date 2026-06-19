// Liferay Analytics Cloud tracking. Mirrors the AC config from the page set up
// for this app at /web/ac-world-cup-2026-bet (DEV SDK + internal publisher).
// The SDK loads once; pageViews are sent per client route.

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
let pendingPage: {page: string; title?: string} | null = null;

function sendPageView(page: string, title?: string): void {
	window.Analytics?.send('pageViewed', 'Page', {
		page,
		...(title ? {title} : {}),
	});
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

		if (pendingPage) {
			sendPageView(pendingPage.page, pendingPage.title);
			pendingPage = null;
		}
	};

	document.head.appendChild(script);
}

// A page view for a client route. Queued until the SDK finishes loading, so the
// first view (fired before onload) isn't lost.
export function acPageView(page: string, title?: string): void {
	if (ready) {
		sendPageView(page, title);
	}
	else {
		pendingPage = {page, title};
	}
}

// A custom event — mirrors the GA custom events. No-op until the SDK is ready
// (these fire on user actions, well after load).
export function acTrack(
	eventId: string,
	properties?: Record<string, unknown>
): void {
	if (ready) {
		window.Analytics?.track(eventId, properties);
	}
}
