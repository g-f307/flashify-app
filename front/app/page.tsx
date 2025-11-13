// Caminho: app/(landing)/page.tsx
"use client";

import { useEffect } from 'react';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  // Força o tema claro na landing page
  useEffect(() => {
    // Remove a classe 'dark' do elemento HTML
    document.documentElement.classList.remove('dark');
    
    // Adiciona atributo data-theme para garantir
    document.documentElement.setAttribute('data-theme', 'light');
    
    // Cleanup
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

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