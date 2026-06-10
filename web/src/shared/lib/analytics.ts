declare global {
    interface Window {
        gtag?: (
            command: 'event' | 'config' | 'js',
            targetOrAction: string,
            params?: Record<string, any>
        ) => void;
    }
}

function isTrackingDisabled(): boolean {
    if (typeof window === 'undefined') return true;

    if (import.meta.env.DEV) return true;

    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') && !hostname.includes('cityrecreationfinder')) {
        return  true;
    }
    // To disable, run: localStorage.setItem('disable_analytics', 'true')
    // To re-enable: localStorage.removeItem('disable_analytics')
    const manuallyDisabled = localStorage.getItem('disable_analytics') === 'true';
    if (manuallyDisabled) return true;
    return false;
}

export function trackEvent(eventName: string, params?: Record<string, any>) {
    if (isTrackingDisabled()) {
        console.log('[Analytics Disabled]', eventName, params);
        return;
    }
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, params);
    }
}

export function trackPageView(pagePath: string, pageTitle?: string) {
    trackEvent('page_view', {
        page_path: pagePath,
        page_title: pageTitle,
    })
}