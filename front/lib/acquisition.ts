export type AcquisitionContext = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  first_touch_at?: string;
};

const STORAGE_KEY = "flashify_acquisition_context";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function captureAcquisitionContext(): void {
  if (!isBrowser()) {
    return;
  }

  const existing = getAcquisitionContext();
  if (existing) {
    return;
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const referrer = document.referrer || undefined;
  const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(
    (key) => searchParams.has(key)
  );

  if (!hasUtm && !referrer) {
    return;
  }

  const context: AcquisitionContext = {
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
    referrer,
    landing_page: `${url.pathname}${url.search}`,
    first_touch_at: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function getAcquisitionContext(): AcquisitionContext | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AcquisitionContext;
  } catch {
    return null;
  }
}
