// front/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getCurrentLandingVisitContext } from '@/lib/acquisition';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';
import { LoadingScreen } from '@/components/ui/loading-screen';

const LANDING_VISIT_DEDUP_MS = 5000;

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ✅ Força o tema claro na landing page
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  // ✅ Redireciona usuário autenticado ANTES de renderizar
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined" || loading || user) {
      return;
    }

    const dedupeKey = "flashify_last_landing_visit";
    const now = Date.now();
    const signature = `${window.location.pathname}${window.location.search}`;
    const previousRaw = window.sessionStorage.getItem(dedupeKey);

    if (previousRaw) {
      try {
        const previous = JSON.parse(previousRaw) as { signature?: string; tracked_at?: number };
        if (
          previous.signature === signature &&
          typeof previous.tracked_at === "number" &&
          now - previous.tracked_at < LANDING_VISIT_DEDUP_MS
        ) {
          return;
        }
      } catch {
        window.sessionStorage.removeItem(dedupeKey);
      }
    }

    window.sessionStorage.setItem(
      dedupeKey,
      JSON.stringify({ signature, tracked_at: now })
    );
    apiClient.trackLandingVisit(getCurrentLandingVisitContext());
  }, [loading, user]);

  // ✅ Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <LoadingScreen 
        message="Carregando..." 
        fullScreen={true}
      />
    );
  }

  // ✅ Não renderiza landing se usuário está autenticado
  if (user) {
    return null;
  }

  // ✅ Só renderiza landing se não há usuário
  return (
    <div className="landing-page-theme light" data-theme="light">
      <main className="w-full">
        <Header />
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <ContactSection />
        <Footer />
      </main>
    </div>
  );
}
