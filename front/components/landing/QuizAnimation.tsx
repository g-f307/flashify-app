// Caminho: components/landing/QuizAnimation.tsx (Corrigido)
"use client";

import { useState, useEffect } from 'react';
import { FaFilePdf, FaImage, FaFileAlt, FaCamera, FaLink, FaCheck, FaTimes } from 'react-icons/fa';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: 'Qual é a capital do Brasil?',
    options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: 'Quantos planetas existem no Sistema Solar?',
    options: ['7', '8', '9', '10'],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: 'Qual é o maior oceano do mundo?',
    options: ['Atlântico', 'Índico', 'Ártico', 'Pacífico'],
    correctAnswer: 3,
  },
];

const pileIcons = [<FaFilePdf />, <FaImage />, <FaFileAlt />, <FaCamera />, <FaLink />];

const QuizAnimation = () => {
  const [animationStep, setAnimationStep] = useState<'pile' | 'quiz' | 'done'>('pile');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Animação inicial
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationStep('quiz'), 2000);
    const timer2 = setTimeout(() => setAnimationStep('done'), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Ciclo de perguntas
  useEffect(() => {
    if (animationStep !== 'done') return;

    const selectTimer = setTimeout(() => {
      const currentQuestion = quizQuestions[currentQuestionIndex];
      setSelectedOption(currentQuestion.correctAnswer);
    }, 2000);

    const resultTimer = setTimeout(() => {
      setShowResult(true);
    }, 2500);

    const nextQuestionTimer = setTimeout(() => {
      setSelectedOption(null);
      setShowResult(false);
      setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % quizQuestions.length);
    }, 4500);

    return () => {
      clearTimeout(selectTimer);
      clearTimeout(resultTimer);
      clearTimeout(nextQuestionTimer);
    };
  }, [currentQuestionIndex, animationStep]);

  const currentQuestion = quizQuestions[currentQuestionIndex];

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

      {/* Card de Quiz */}
      <div
        className={`absolute w-[280px] sm:w-[320px] transition-opacity duration-600 ${
          animationStep === 'done' ? 'opacity-100 animate-[deckArrive_0.6s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]' : 'opacity-0'
        }`}
      >
        <div className="bg-card rounded-xl shadow-xl p-4 sm:p-6 border border-border">
          {/* Pergunta */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-bold text-card-foreground mb-3 sm:mb-4">{currentQuestion.question}</h3>
          </div>

          {/* Opções (border-accent) */}
          <div className="space-y-2 sm:space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showFeedback = showResult && isSelected;

              let optionClass = 'bg-muted hover:bg-accent/20';
              if (isSelected && !showResult) {
                optionClass = 'bg-accent/20 border-accent';
              } else if (showFeedback) {
                optionClass = isCorrect
                  ? 'bg-green-100 border-green-500 text-green-800'
                  : 'bg-red-100 border-red-500 text-red-800';
              }

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all duration-300 ${optionClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-muted-foreground text-sm sm:text-base">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="font-medium text-sm sm:text-base">{option}</span>
                  </div>
                  {showFeedback && (
                    <span className="text-xl">
                      {isCorrect ? <FaCheck className="text-green-600" /> : <FaTimes className="text-red-600" />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===========================================
          CORREÇÃO: A "Barra de Progresso" (pontinhos)
          que estava aqui foi REMOVIDA.
         =========================================== */}
    </div>
  );
};

export default QuizAnimation;