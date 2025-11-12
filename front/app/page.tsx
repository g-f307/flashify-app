import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ContactSection from '@/components/landing/ContactSection';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="landing-page-theme">
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