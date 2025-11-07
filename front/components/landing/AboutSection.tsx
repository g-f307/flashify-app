// Caminho: components/landing/AboutSection.tsx (Atualizado com Transições)

import { FaClock, FaInfinity, FaBrain } from 'react-icons/fa';
import SimpleWaveDivider from './SimpleWaveDivider';

const AboutSection = () => {
  const features = [
    {
      icon: <FaClock />,
      title: 'Deixe o trabalho repetitivo para a nossa IA',
      description:
        'O seu tempo é valioso demais para ser gasto criando decks de estudo manualmente. Deixe que a nossa tecnologia faça o trabalho pesado por você.',
    },
    {
      icon: <FaInfinity />,
      title: 'Se pode ser lido, pode virar material de estudo',
      description:
        'Esqueça as limitações. O Flashify adapta-se ao seu material de estudo, seja ele qual for, centralizando todo o seu conhecimento num só lugar.',
    },
    {
      icon: <FaBrain />,
      title: 'Aprenda de forma mais inteligente, não mais difícil',
      description:
        'Estudar não é só ler, é reter. O nosso sistema é baseado na ciência da memória para garantir que o conteúdo fique fixado.',
    },
  ];

  return (
    <section 
      id="why" 
      className="relative bg-muted pt-16 md:pt-20 pb-32 md:pb-40"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fadeInUp">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">POR QUE USAR O FLASHIFY?</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            O Flashify é uma plataforma que transforma o seu material de estudo em flashcards e quizzes utilizando
            Inteligência Artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-background p-8 rounded-xl shadow-lg border border-border
                         hover-lift hover-glow transition-smooth
                         animate-fadeInScale opacity-0"
              style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards' }}
            >
              <div className="flex justify-center mb-6">
                
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center 
                              text-3xl text-accent-foreground shadow-lg
                              transition-smooth hover:scale-110 hover:rotate-12">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-center text-foreground transition-colors hover:text-accent">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-center leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <SimpleWaveDivider position="bottom" color="#FFFFFF" flip={true} />
    </section>
  );
};

export default AboutSection;