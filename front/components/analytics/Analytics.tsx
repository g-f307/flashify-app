// front/components/analytics/Analytics.tsx
"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Script from "next/script"

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    clarity: (...args: any[]) => void
  }
}

function RouteTracker({ gaMeasurementId }: { gaMeasurementId: string | undefined }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!gaMeasurementId || typeof window === 'undefined') return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    
    const trackPageView = () => {
      if (window.gtag) {
        window.gtag('config', gaMeasurementId, {
          page_path: url,
          send_page_view: true
        })
      }
    }

    trackPageView()
    const timer = setTimeout(trackPageView, 1000)

    return () => clearTimeout(timer)
  }, [pathname, searchParams, gaMeasurementId])

  return null
}

const Analytics = () => {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18267058425"
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

  return (
    <>
      {/* Google Analytics */}
      {gaMeasurementId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          />
          <Script
            id="google-analytics-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  page_path: window.location.pathname,
                  send_page_view: true,
                  cookie_flags: 'SameSite=None;Secure'
                });
              `,
            }}
          />
          <Suspense fallback={null}>
            <RouteTracker gaMeasurementId={gaMeasurementId} />
          </Suspense>
        </>
      )}

      {/* Google Ads */}
      {googleAdsId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          />
          <Script
            id="google-ads-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAdsId}');
              `,
            }}
          />
        </>
      )}

      {/* Microsoft Clarity */}
      {clarityProjectId && (
        <>
          <Script
            id="microsoft-clarity-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityProjectId}");
              `,
            }}
          />
          <Script
            id="microsoft-clarity-consent"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                // Aguardar Clarity carregar e dar consentimento
                (function checkClarity() {
                  if (typeof window.clarity === 'function') {
                    window.clarity("consent");
                    console.log('✅ Clarity consent granted');
                  } else {
                    setTimeout(checkClarity, 100);
                  }
                })();
              `,
            }}
          />
        </>
      )}
    </>
  )
}

export default Analytics
