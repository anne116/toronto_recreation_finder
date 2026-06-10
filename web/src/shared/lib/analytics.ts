declare global {
    interface Window {
        gtag?: (
            command: 'event' | 'config' | 'js',
            targetOrAction: string,
            params?: Record<string, any>
        ) => void;
    }
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, params);

        if (import.meta.env.DEV) {
            console.log('[Analytics Event]', eventName, params);
        }
    }
}

export function trackPageView(pagePath: string, pageTitle?: string) {
    trackEvent('page_view', {
        page_path: pagePath,
        page_title: pageTitle,
    })
}