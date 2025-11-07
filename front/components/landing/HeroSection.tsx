// Caminho: components/landing/HeroSection.tsx (Atualizado)
"use client"; 

import { Button } from "@/components/ui/button";
import HeroWaveDivider from "./HeroWaveDivider"; 
import FlashcardAnimation from "./FlashcardAnimation";
import QuizAnimation from "./QuizAnimation";
import Link from "next/link";

const HeroSection = () => {
  const textShadowClass = "[text-shadow:0_2px_4px_rgba(0,0,0,0.3)]";

  return (
    <section
      id="hero"
      className="relative min-h-screen pt-24 md:pt-48 pb-16 overflow-hidden bg-gradient-hero"
    >
      <div className="container mx-auto px-4 py-20">
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          <div className="text-center md:text-left space-y-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fadeInLeft">
              <span className={`text-accent ${textShadowClass}`}>Otimize </span>
              <span className="text-white">a maneira como você estuda.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto md:mx-0 animate-fadeInLeft delay-200">
              O Flashify usa Inteligência Artificial para extrair o essencial de qualquer texto
              e criar decks de estudo inteligente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-fadeInLeft delay-300">
              <Link href="/register">
                <Button
                  size="lg"
                  className="
                             bg-accent hover:bg-accent/90 
                             text-lg px-8 py-6 rounded-full 
                             shadow-[var(--shadow-button)] hover:shadow-xl 
                             transition-all hover:scale-105 duration-300
                             text-accent-foreground
                             font-bold
                             hover-shimmer
                             "
                >
                  CADASTRE-SE
                </Button>
              </Link>
            </div>
          </div>

          
          <div 
            className="relative min-h-[450px] md:min-h-0 h-full 
                       flex items-center justify-center animate-fadeInRight"
          >
            
            <div className="
                absolute w-3/4 left-0 -rotate-[6deg]
                md:w-[320px] md:left-auto md:translate-x-[-30%]
                transform
                transition-all duration-500 hover:rotate-[-8deg] hover:scale-105 hover:z-20
            ">
              <QuizAnimation />
            </div>

            <div className="
                absolute w-3/4 right-0 rotate-[8deg]
                md:w-[280px] md:right-auto md:translate-x-[30%]
                transform 
                z-10 transition-all duration-500 hover:rotate-[10deg] hover:scale-105
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