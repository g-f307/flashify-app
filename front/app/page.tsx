// front/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';
import { LoadingScreen } from '@/components/ui/loading-screen';

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