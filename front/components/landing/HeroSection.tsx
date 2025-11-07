// Caminho: components/landing/HeroSection.tsx (Completo e Corrigido)
"use client"; 

import { Button } from "@/components/ui/button";
import HeroWaveDivider from "./HeroWaveDivider"; 
import FlashcardAnimation from "./FlashcardAnimation";
import QuizAnimation from "./QuizAnimation";

const HeroSection = () => {
  const textShadowClass = "[text-shadow:0_2px_4px_rgba(0,0,0,0.3)]";

  return (
    <section
      id="hero"
      /* ===========================================
          CORREÇÃO 1: Padding (Espaço Vazio)
          - 'pt-24' (96px) para mobile (menos espaço).
          - 'md:pt-48' (192px) para desktop (mantido).
         =========================================== */
      className="relative min-h-screen pt-24 md:pt-48 pb-16 overflow-hidden bg-gradient-hero"
    >
      <div className="container mx-auto px-4 py-20">
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Conteúdo textual (Mantido) */}
          <div className="text-center md:text-left space-y-8 animate-fadeInUp">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className={`text-accent ${textShadowClass}`}>Sua matéria </span>
              <span className="text-white">inteira transformada em flashcards</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto md:mx-0">
              O Flashify usa Inteligência Artificial para extrair o essencial de qualquer texto
              e criar cartões de estudo para você.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button
                size="lg"
                className="
                           bg-accent hover:bg-accent/90 
                           text-lg px-8 py-6 rounded-full 
                           shadow-[var(--shadow-button)] hover:shadow-xl 
                           transition-all hover:scale-105
                           text-accent-foreground
                           font-bold
                           animate-pulse-shadow
                           "
              >
                CRIAR GRÁTIS
              </Button>
            </div>
          </div>

          
          {/* ===========================================
              CORREÇÃO 2: Layout (Desktop Quebrado)
              - O 'min-h-[450px]' é mantido para dar espaço no mobile.
              - Os wrappers das animações são 'absolute' sempre.
              - As classes 'md:' agora SOBRESCREVEM as classes mobile,
                em vez de as substituir (removi 'md:relative').
           =========================================== */}
          <div 
            className="animate-fadeInUp relative min-h-[450px] md:min-h-0 h-full 
                       flex items-center justify-center"
          >
            
            {/* Animação do Quiz (atrás) */}
            <div className="
                absolute w-3/4 left-0 -rotate-[6deg] /* Mobile: 'entrelaçado' com w-3/4 */
                md:w-[320px] md:left-auto md:translate-x-[-30%] /* Desktop: layout fixo */
                transform
                transition-all hover:rotate-[-8deg] hover:scale-105 duration-300 hover:z-20
            ">
              <QuizAnimation />
            </div>

            {/* Animação do Flashcard (frente) */}
            <div className="
                absolute w-3/4 right-0 rotate-[8deg] /* Mobile: 'entrelaçado' com w-3/4 */
                md:w-[280px] md:right-auto md:translate-x-[30%] /* Desktop: layout fixo */
                transform 
                z-10 transition-all hover:rotate-[10deg] hover:scale-105 duration-300
            ">
              <FlashcardAnimation />
            </div>

          </div>
        </div>
      </div>

      <HeroWaveDivider position="bottom" color="fill-card" />
    </section>
  );
};

export default HeroSection;