// front/components/analytics/GoogleAnalytics.tsx
"use client"

import Script from "next/script"

const GoogleAnalytics = () => {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  // Não renderiza nada se o ID não estiver definido
  if (!gaMeasurementId) {
    return null
  }

  return (
    <>
      {/* Carrega a biblioteca gtag.js do Google */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      />
      {/* Inicializa o dataLayer e configura o Google Analytics */}
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `,
        }}
      />
    </>
  )
}

export default GoogleAnalytics