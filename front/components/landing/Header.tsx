// Caminho: components/landing/Header.tsx (Corrigido para modo claro)
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Menu, X } from 'lucide-react';

const navLinks = [
  { id: 'hero', label: 'Início' },
  { id: 'why', label: 'Por que usar?' },
  { id: 'how-it-works', label: 'Como Funciona' },
  { id: 'contact', label: 'Fale Conosco' },
];

const Header = () => {
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < 100) {
        setVisible(true);
      } else if (currentY > lastY) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastY(currentY);

      let currentActive = 'hero';
      for (const link of navLinks) {
        const element = document.getElementById(link.id);
        if (element && window.scrollY >= element.offsetTop - 100) {
          currentActive = link.id;
        }
      }
      setActiveSection(currentActive);
    };
    
    const handleResize = () => {
      if (window.innerWidth > 768) {
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
    setVisible(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      className="fixed left-0 right-0 z-50 px-4"
      animate={{ y: visible ? '16px' : '-120px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="container mx-auto">
        <nav className="flex items-center justify-between bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-gray-200 h-20 overflow-hidden">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer h-full" 
            onClick={() => scrollToSection('hero')}
          >
            <img src="/flashify_logo.svg" alt="Logo Flashify" className="w-auto h-full" /> 
            <span className="text-2xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">Flashify</span>
          </div>

          {/* Links de navegação (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="relative text-gray-900 hover:text-[#FFC300] transition-colors font-semibold"
              >
                {link.label}
                {activeSection === link.id && (
                  <motion.div
                    layoutId="activeMarker"
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-[#FFC300]"
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
              className="bg-[#FFC300] text-white hover:bg-[#FFC300]/90 
                         transition-all duration-300 rounded-full 
                         font-semibold px-8"
              onClick={() => window.location.href = '/login'}
            >
              ENTRAR
            </Button>
          </div>

          {/* Botão Hambúrguer (Mobile) */}
          <div className="md:hidden">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-900 hover:text-gray-700 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* Menu Dropdown Mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 p-6 mt-2"
            >
              <div className="flex flex-col gap-6">
                {navLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`text-lg font-semibold transition-colors ${
                      activeSection === link.id ? 'text-[#FFC300]' : 'text-gray-900'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <Button
                  size="lg"
                  className="bg-[#FFC300] text-white hover:bg-[#FFC300]/90 
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