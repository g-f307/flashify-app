// Caminho: app/page.tsx (Corrigido)

import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
// ADICIONE A IMPORTAÇÃO
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="landing-page-theme">
      <main className="w-full">
        {/* 1. Header Fixo */}
        <Header />

        {/* 2. Seção Hero (id="hero") */}
        <HeroSection />

        {/* 3. Seção "Por que usar?" (id="why") */}
        <AboutSection />

        {/* 4. Seção "Como Funciona" (id="how-it-works") */}
        <HowItWorksSection />

        {/* 5. ADICIONADO: A nova secção de Contato */}
        <ContactSection />
        
        {/* 6. Rodapé */}
        <Footer />
      </main>
    </div>
  );
}