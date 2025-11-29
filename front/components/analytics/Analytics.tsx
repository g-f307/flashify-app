// front/components/analytics/Analytics.tsx
"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Script from "next/script"

// ✅ Declaração de tipos para window
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    clarity: (...args: any[]) => void
  }
}

// ✅ Componente separado para tracking de rotas (usa useSearchParams)
function RouteTracker({ gaMeasurementId }: { gaMeasurementId: string | undefined }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!gaMeasurementId || typeof window === 'undefined') return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    
    // Aguarda o gtag estar disponível
    const trackPageView = () => {
      if (window.gtag) {
        window.gtag('config', gaMeasurementId, {
          page_path: url,
          send_page_view: true
        })
        console.log('📊 Page view tracked:', url)
      }
    }

    // Tenta imediatamente e depois de um delay
    trackPageView()
    const timer = setTimeout(trackPageView, 1000)

    return () => clearTimeout(timer)
  }, [pathname, searchParams, gaMeasurementId])

  return null
}

const Analytics = () => {
  // ✅ Buscar variáveis de ambiente (SEM aspas no .env)
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-17739686976"
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

  // ✅ Debug: Verificar se as variáveis foram carregadas
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Analytics Debug:', {
        gaMeasurementId: gaMeasurementId ? `✅ ${gaMeasurementId}` : '❌ FALTANDO',
        googleAdsId: googleAdsId ? `✅ ${googleAdsId}` : '❌ FALTANDO',
        clarityProjectId: clarityProjectId ? `✅ ${clarityProjectId}` : '❌ FALTANDO'
      })
    }
  }, [gaMeasurementId, googleAdsId, clarityProjectId])

  return (
    <>
      {/* ==================== GOOGLE ANALYTICS ==================== */}
      {gaMeasurementId ? (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            onLoad={() => console.log('✅ Google Analytics script carregado')}
            onError={() => console.error('❌ Erro ao carregar Google Analytics')}
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
                console.log('✅ Google Analytics inicializado: ${gaMeasurementId}');
              `,
            }}
          />
          
          {/* ✅ Suspense boundary para useSearchParams */}
          <Suspense fallback={null}>
            <RouteTracker gaMeasurementId={gaMeasurementId} />
          </Suspense>
        </>
      ) : (
        <Script
          id="analytics-missing-warning"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `console.warn('⚠️ NEXT_PUBLIC_GA_MEASUREMENT_ID não configurado');`
          }}
        />
      )}

      {/* ==================== GOOGLE ADS CONVERSION ==================== */}
      {googleAdsId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            onLoad={() => console.log('✅ Google Ads script carregado')}
            onError={() => console.error('❌ Erro ao carregar Google Ads')}
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
                console.log('✅ Google Ads inicializado: ${googleAdsId}');
              `,
            }}
          />
        </>
      )}

      {/* ==================== MICROSOFT CLARITY ==================== */}
      {clarityProjectId ? (
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
              console.log('✅ Microsoft Clarity inicializado: ${clarityProjectId}');
            `,
          }}
          onLoad={() => console.log('✅ Microsoft Clarity script carregado')}
          onError={() => console.error('❌ Erro ao carregar Microsoft Clarity')}
        />
      ) : (
        <Script
          id="clarity-missing-warning"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `console.warn('⚠️ NEXT_PUBLIC_CLARITY_PROJECT_ID não configurado');`
          }}
        />
      )}
    </>
  )
}

export default Analytics