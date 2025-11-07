// Caminho: components/landing/Header.tsx (Completo e Corrigido)
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
// Ícones para o menu mobile (react-icons já está instalado)
import { Menu, X } from 'lucide-react'; 

// Links de navegação
const navLinks = [
  { id: 'hero', label: 'Início' },
  { id: 'why', label: 'Por que usar?' },
  { id: 'how-it-works', label: 'Como Funciona' },
  { id: 'contact', label: 'Fale Conosco' },
];

const Header = () => {
  // --- Estados para interatividade ---
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  // NOVO: Estado para controlar o menu mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Lógica de Scroll (Hide/Show e Scroll Spy) ---
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      // 1. Lógica para esconder/mostrar o Header
      if (currentY < 100) {
        setVisible(true);
      } else if (currentY > lastY) {
        setVisible(false); // A descer
      } else {
        setVisible(true); // A subir
      }
      setLastY(currentY);

      // 2. Lógica do "Scroll Spy"
      let currentActive = 'hero';
      for (const link of navLinks) {
        const element = document.getElementById(link.id);
        if (element && window.scrollY >= element.offsetTop - 100) {
          currentActive = link.id;
        }
      }
      setActiveSection(currentActive);
    };
    
    // Fecha o menu mobile se o ecrã for redimensionado para desktop
    const handleResize = () => {
      if (window.innerWidth > 768) { // 768px é o breakpoint 'md'
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [lastY]);

  // --- Função de Scroll (Modificada) ---
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
    setVisible(false); // Esconde ao clicar
    setIsMobileMenuOpen(false); // Fecha o menu mobile ao clicar
  };

  return (
    // Header animado (hide/show)
    <motion.header
      className="fixed left-0 right-0 z-50 px-4"
      animate={{ y: visible ? '16px' : '-120px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="container mx-auto">
        <nav className="flex items-center justify-between bg-card/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-border/50 h-20 overflow-hidden">
          
          {/* Logo (Mantida) */}
          <div 
            className="flex items-center gap-3 cursor-pointer h-full" 
            onClick={() => scrollToSection('hero')}
          >
            <img src="/flashify_logo.svg" alt="Logo FLashify" className="w-auto h-full" /> 
            <span className="text-2xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">Flashify</span>
          </div>

          {/* Links de navegação (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="relative text-foreground hover:text-primary transition-colors font-semibold"
              >
                {link.label}
                {activeSection === link.id && (
                  <motion.div
                    layoutId="activeMarker"
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-accent"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Botão CTA (Desktop) */}
          <div className="hidden md:block">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 
                         transition-all duration-300 rounded-full 
                         font-semibold px-8"
              onClick={() => window.location.href = '/login'}
            >
              ENTRAR
            </Button>
          </div>

          {/* NOVO: Botão Hambúrguer (Mobile) */}
          <div className="md:hidden">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* NOVO: Menu Dropdown Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-6 mt-2"
            >
              <div className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`text-lg font-semibold transition-colors ${
                      activeSection === link.id ? 'text-accent' : 'text-foreground'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 
                             transition-all duration-300 rounded-full 
                             font-semibold px-8"
                  onClick={() => window.location.href = '/login'}
                >
                  ENTRAR
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;