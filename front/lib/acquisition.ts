export type AcquisitionContext = {
  visitor_id?: string;
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
const VISITOR_ID_STORAGE_KEY = "flashify_visitor_id";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateVisitorId(): string | null {
  if (!isBrowser()) {
    return null;
  }

  const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const visitorId = createVisitorId();
  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
  return visitorId;
}

function buildCurrentAcquisitionContext(): AcquisitionContext | null {
  if (!isBrowser()) {
    return null;
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const referrer = document.referrer || undefined;
  const hasUtm = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(
    (key) => searchParams.has(key)
  );

  if (!hasUtm && !referrer) {
    return null;
  }

  return {
    visitor_id: getOrCreateVisitorId() || undefined,
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
    referrer,
    landing_page: `${url.pathname}${url.search}`,
    first_touch_at: new Date().toISOString(),
  };
}

export function captureAcquisitionContext(): void {
  if (!isBrowser()) {
    return;
  }

  const existing = getAcquisitionContext();
  if (existing) {
    return;
  }

  const context = buildCurrentAcquisitionContext();
  if (!context) {
    return;
  }

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

export function getCurrentLandingVisitContext(): AcquisitionContext {
  if (!isBrowser()) {
    return {};
  }

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  return {
    visitor_id: getOrCreateVisitorId() || undefined,
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
    utm_content: searchParams.get("utm_content") || undefined,
    utm_term: searchParams.get("utm_term") || undefined,
    referrer: document.referrer || undefined,
    landing_page: `${url.pathname}${url.search}`,
    first_touch_at: new Date().toISOString(),
  };
}
