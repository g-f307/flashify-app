// Caminho: components/landing/FlashcardAnimation.tsx (Corrigido)
"use client";

import { useState, useEffect } from 'react';
import { FaAtom, FaGlobeAmericas, FaSquareRootAlt, FaFilePdf, FaImage, FaFileAlt, FaCamera, FaLink } from 'react-icons/fa';

interface FlashcardData {
  id: number;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const flashcards: FlashcardData[] = [
  { id: 1, question: 'Qual é o símbolo do ouro?', answer: 'Au', icon: <FaAtom /> },
  { id: 2, question: 'Qual a capital da França?', answer: 'Paris', icon: <FaGlobeAmericas /> },
  { id: 3, question: 'Qual a fórmula de Bhaskara?', answer: 'x = [-b ± √Δ] / 2a', icon: <FaSquareRootAlt /> },
];

const pileIcons = [<FaFilePdf />, <FaImage />, <FaFileAlt />, <FaCamera />, <FaLink />];

const FlashcardAnimation = () => {
  const [animationStep, setAnimationStep] = useState<'pile' | 'deck' | 'done'>('pile');
  const [flippedCardId, setFlippedCardId] = useState<number | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [exitingCardId, setExitingCardId] = useState<number | null>(null);

  // Animação inicial
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationStep('deck'), 2000);
    const timer2 = setTimeout(() => setAnimationStep('done'), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Ciclo de cards
  useEffect(() => {
    if (animationStep !== 'done') return;

    const currentCard = flashcards[currentCardIndex];

    const flipTimer = setTimeout(() => {
      setFlippedCardId(currentCard.id);
    }, 2500);

    const nextCardTimer = setTimeout(() => {
      setExitingCardId(currentCard.id);

      setTimeout(() => {
        setCurrentCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
        setFlippedCardId(null);
        setExitingCardId(null);
      }, 500);
    }, 4500);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(nextCardTimer);
    };
  }, [currentCardIndex, animationStep]);

  const orderedFlashcards = [...flashcards.slice(currentCardIndex), ...flashcards.slice(0, currentCardIndex)];

  const cardStackStyles = [
    'rotate-[2deg] z-30',
    'rotate-[-8deg] translate-x-[5px] z-20',
    'rotate-[6deg] translate-x-[10px] z-10',
  ];

  return (
    <div className="relative w-full h-full min-h-[400px] flex justify-center items-center">
      {/* Pilha de Ícones Caindo (text-accent) */}
      <div
        className={`absolute w-[250px] h-[200px] transition-all duration-500 ease-in ${
          animationStep === 'pile' ? 'opacity-100' : 'opacity-0 scale-50'
        }`}
      >
        {pileIcons.map((icon, index) => (
          <div
            key={index}
            className={`absolute text-5xl text-accent opacity-0 ${
              animationStep === 'pile' ? 'animate-[fallIn_1.2s_cubic-bezier(0.68,-0.55,0.27,1.55)_forwards]' : ''
            }`}
            style={{
              top: ['10%', '60%', '0%', '20%', '70%'][index],
              left: ['50%', '30%', '10%', '90%', '70%'][index],
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* Baralho de Flashcards */}
      <div
        className={`absolute w-[260px] h-[340px] sm:w-[280px] sm:h-[360px] transition-opacity duration-600 ${
          animationStep === 'done' ? 'opacity-100 animate-[deckArrive_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]' : 'opacity-0'
        }`}
        style={{ perspective: '1000px' }}
      >
        {orderedFlashcards.map((card, index) =>
          index < 3 ? (
            <div
              key={card.id}
              className={`absolute w-full h-full transition-all duration-500 ${cardStackStyles[index]} ${
                exitingCardId === card.id ? 'animate-[sendToBack_0.5s_ease-out_forwards]' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="relative w-full h-full transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flippedCardId === card.id ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Frente do Card (text-accent) */}
                <div
                  className="absolute w-full h-full rounded-xl shadow-xl bg-card p-4 sm:p-5 flex flex-col justify-center items-center text-center border border-border"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-4xl sm:text-5xl text-accent mb-4 sm:mb-5">{card.icon}</span>
                  <p className="text-lg sm:text-xl font-bold text-card-foreground">{card.question}</p>
                </div>

                {/* Verso do Card (bg-accent) */}
                <div
                  className="absolute w-full h-full rounded-xl shadow-xl bg-accent p-5 flex flex-col justify-center items-center border border-accent"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-2xl sm:text-3xl font-extrabold text-accent-foreground text-center">{card.answer}</p>
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* ===========================================
          CORREÇÃO: A "Barra de Progresso" (pontinhos)
          que estava aqui foi REMOVIDA.
         =========================================== */}
    </div>
  );
};

export default FlashcardAnimation;