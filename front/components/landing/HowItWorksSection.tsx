// Caminho: components/landing/HowItWorksSection.tsx (Atualizado com Transições)

import { FaUpload, FaMagic, FaGraduationCap } from 'react-icons/fa';
import SimpleWaveDivider from './SimpleWaveDivider';

const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      icon: <FaUpload />,
      title: 'Envie o seu Conteúdo',
      description:
        'Faça o upload de PDF, Word, PowerPoint, cole um texto diretamente ou tire uma foto das suas anotações. O Flashify é compatível com as suas fontes de estudo preferidas.',
    },
    {
      number: 2,
      icon: <FaMagic />,
      title: 'Deixe a IA Trabalhar',
      description:
        'Com um clique, a nossa Inteligência Artificial analisa o seu material, identifica os conceitos chave e gera automaticamente flashcards e quizzes completos para você.',
    },
    {
      number: 3,
      icon: <FaGraduationCap />,
      title: 'Comece a Aprender',
      description:
        'Use o nosso modo de estudo inteligente, baseado em repetição espaçada, para memorizar o conteúdo de forma eficaz e garantir que o conhecimento dure muito para além da prova.',
    },
  ];

  return (
    <section 
      id="how-it-works" 
      className="relative bg-background pt-16 md:pt-20 pb-32 md:pb-40"
    >
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fadeInUp">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">COMO FUNCIONA</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            O nosso objetivo é remover a fricção entre o seu material de estudo e o aprendizado real. O processo é
            rápido, intuitivo e focado na sua eficiência.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex flex-col md:flex-row items-center gap-8 mb-12 
                         animate-fadeInScale opacity-0
                         ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'forwards' }}
            >
              {/* Círculo com número */}
              <div className="flex-shrink-0">

                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-xl
                               transition-smooth hover:scale-110 hover-glow animate-pulse-smooth">
                  <span className="text-4xl font-bold text-primary-foreground">{step.number}</span>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 bg-card p-8 rounded-xl shadow-lg border border-border
                            hover-lift transition-smooth">
                <div className="flex items-center gap-4 mb-4">
                  
                  <div className="text-3xl text-primary transition-smooth hover:scale-125 hover:rotate-12">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground transition-colors hover:text-primary">
                    {step.title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SimpleWaveDivider position="bottom" color="#F2F2F2" flip={true} />
    </section>
  );
};

export default HowItWorksSection;
