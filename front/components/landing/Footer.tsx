// Caminho: components/landing/Footer.tsx (Atualizado com Transições)
"use client";

import { FaLinkedin, FaInstagram, FaFacebook, FaTwitter, FaEnvelope, FaGlobe, FaPhone } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-900 text-slate-300 pt-24 pb-8 border-t border-slate-700">
      
      <div className="container mx-auto px-4">
        {/* Logo em destaque */}
        <div className="text-center mb-12 relative z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[100px] sm:w-[250px] sm:h-[120px] bg-gradient-to-br from-primary/40 to-accent/30 rounded-[50%_40%_50%_60%/60%_50%_40%_50%] blur-xl opacity-70 animate-[pulse-light_3s_ease-in-out_infinite]" />
          <div className="inline-flex items-center gap-3 cursor-pointer relative z-20">
            <img src="/flashify_logo.svg" alt="Logo Flashify" className="w-14 h-14" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Flashify
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          {/* Coluna 1: Sobre e Redes Sociais */}
          <div className="text-center animate-fadeInUp">
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Sobre</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              A forma mais inteligente e eficiente de transformar seu material de estudo em aprovação.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-slate-400 hover:text-white transform hover:scale-110 transition-smooth"
              >
                <FaLinkedin className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-slate-400 hover:text-white transform hover:scale-110 transition-smooth"
              >
                <FaInstagram className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="text-slate-400 hover:text-white transform hover:scale-110 transition-smooth"
              >
                <FaFacebook className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="text-slate-400 hover:text-white transform hover:scale-110 transition-smooth"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Links Úteis */}
          <div className="text-center animate-fadeInUp delay-100">
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Links Úteis</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-300 hover:text-white transition-smooth hover:translate-x-1 inline-block">
                  Termos & Condições
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-white transition-smooth hover:translate-x-1 inline-block">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-white transition-smooth hover:translate-x-1 inline-block">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-300 hover:text-white transition-smooth hover:translate-x-1 inline-block">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contato */}
          <div className="text-center animate-fadeInUp delay-200">
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-center gap-3 text-slate-300 hover:text-white transition-smooth">
                <FaEnvelope className="w-5 h-5 text-slate-500" />
                flashify@company.cloud
              </li>
              <li className="flex items-center justify-center gap-3 text-slate-300 hover:text-white transition-smooth">
                <FaGlobe className="w-5 h-5 text-slate-500" />
                http://flashify.cloud
              </li>
              <li className="flex items-center justify-center gap-3 text-slate-300 hover:text-white transition-smooth">
                <FaPhone className="w-5 h-5 text-slate-500" />
                +55 (92) 99999-9999
              </li>
            </ul>
          </div>
          
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-6 text-center text-slate-500 text-sm">
          <p>© {currentYear} Flashify. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;