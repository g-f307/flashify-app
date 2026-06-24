// front/lib/analytics-utils.ts

/**
 * Utilitários para tracking de eventos no Google Analytics e Clarity
 */

// ==================== GOOGLE ANALYTICS ====================

/**
 * Envia um evento customizado para o Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams)
    console.log('📊 Event tracked:', eventName, eventParams)
  }
}

/**
 * Tracking de conversões do Google Ads
 */
export const trackConversion = (conversionLabel: string, value?: number) => {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
  if (typeof window !== 'undefined' && window.gtag && adsId) {
    window.gtag('event', 'conversion', {
      send_to: `${adsId}/${conversionLabel}`,
      value: value || 0,
      currency: 'BRL'
    })
    console.log('💰 Conversion tracked:', conversionLabel)
  }
}

/**
 * Tracking de conversão do Google Ads com send_to completo.
 */
export const trackAdsConversion = (
  sendTo: string,
  value = 0,
  currency = "BRL",
  eventCallback?: () => void
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: sendTo,
      value,
      currency,
      event_callback: eventCallback,
    })
    console.log("💰 Ads conversion tracked:", sendTo)
    return
  }

  if (eventCallback) {
    eventCallback()
  }
}

// ==================== EVENTOS PRÉ-CONFIGURADOS ====================

/**
 * Tracking de cadastro de usuário
 */
export const trackSignUp = (method: 'email' | 'google') => {
  trackEvent('sign_up', {
    method: method,
    timestamp: new Date().toISOString()
  })
  
  // Conversão do Google Ads (substitua pelo seu label)
  trackConversion('SIGNUP_CONVERSION_LABEL')
}

/**
 * Tracking de login
 */
export const trackLogin = (method: 'email' | 'google') => {
  trackEvent('login', {
    method: method,
    timestamp: new Date().toISOString()
  })
}

/**
 * Tracking de criação de deck
 */
export const trackDeckCreated = (deckType: 'flashcards' | 'quiz' | 'both') => {
  trackEvent('deck_created', {
    deck_type: deckType,
    timestamp: new Date().toISOString()
  })
  
  // Conversão importante
  trackConversion('CREATE_DECK_LABEL')
}

/**
 * Tracking de geração com IA
 */
export const trackAIGeneration = (type: 'flashcards' | 'quiz') => {
  trackEvent('ai_generation', {
    generation_type: type,
    timestamp: new Date().toISOString()
  })
}

/**
 * Tracking de sessão de estudo
 */
export const trackStudySession = (
  deckId: number,
  cardsStudied: number,
  duration: number // em segundos
) => {
  trackEvent('study_session', {
    deck_id: deckId,
    cards_studied: cardsStudied,
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  })
}

/**
 * Tracking de quiz completado
 */
export const trackQuizCompleted = (
  deckId: number,
  score: number,
  totalQuestions: number
) => {
  trackEvent('quiz_completed', {
    deck_id: deckId,
    score: score,
    total_questions: totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100),
    timestamp: new Date().toISOString()
  })
}

/**
 * Tracking de erro/bug reportado
 */
export const trackBugReport = (category: string, priority: string) => {
  trackEvent('bug_reported', {
    category: category,
    priority: priority,
    timestamp: new Date().toISOString()
  })
}

/**
 * Tracking de feedback de usuário
 */
export const trackUserFeedback = (rating: number, type: string) => {
  trackEvent('user_feedback', {
    rating: rating,
    feedback_type: type,
    timestamp: new Date().toISOString()
  })
}

// ==================== MICROSOFT CLARITY ====================

/**
 * Identifica o usuário no Clarity
 */
export const identifyClarityUser = (userId: string, userEmail?: string) => {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('identify', userId, {
      email: userEmail
    })
    console.log('👤 Clarity user identified:', userId)
  }
}

/**
 * Adiciona tag customizada no Clarity
 */
export const addClarityTag = (key: string, value: string) => {
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('set', key, value)
  }
}

// ==================== TIPOS ====================

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    clarity: (...args: any[]) => void
  }
}
