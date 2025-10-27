"use client";

import { CheckCircle, Loader2, FileText, BrainCircuit, Sparkles, Database, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const keywords = {
  start: "iniciando processamento",
  extract: "extraindo texto",
  ai_flashcards: "gerando flashcards com ia",
  parse_flashcards: "parsing flashcards",
  save_flashcards: "salvando flashcards",
  ai_quiz: "gerando quiz com ia",
  parse_quiz: "parsing quiz",
  save_quiz: "salvando quiz",
  done: "concluído",
};

interface ContentLoaderProps {
  currentStepMessage?: string | null;
  generatesFlashcards: boolean;
  generatesQuizzes: boolean;
}

export default function ContentLoader({ 
  currentStepMessage, 
  generatesFlashcards, 
  generatesQuizzes 
}: ContentLoaderProps) {
  
  const currentStepMessageLower = (currentStepMessage || "").toLowerCase();
  const isCompleted = currentStepMessageLower.includes(keywords.done);
  
  const processingSteps = useMemo(() => {
    const steps = [];
    steps.push({ 
      name: "Iniciando processamento", 
      icon: Sparkles, 
      keyword: keywords.start
    });
    steps.push({ 
      name: "Extraindo texto do arquivo", 
      icon: FileText, 
      keyword: keywords.extract
    });
    
    if (generatesFlashcards) {
      steps.push({ 
        name: "Gerando seus flashcards", 
        icon: BrainCircuit, 
        keyword: keywords.ai_flashcards
      });
      steps.push({ 
        name: "Estruturando seus flashcards", 
        icon: Sparkles, 
        keyword: keywords.parse_flashcards
      });
      steps.push({ 
        name: "Salvando seus flashcards", 
        icon: Database, 
        keyword: keywords.save_flashcards
      });
    }

    if (generatesQuizzes) {
      steps.push({ 
        name: "Gerando seu quiz", 
        icon: BrainCircuit, 
        keyword: keywords.ai_quiz
      });
      steps.push({ 
        name: "Estruturando seu quiz", 
        icon: ClipboardCheck, 
        keyword: keywords.parse_quiz
      });
      steps.push({ 
        name: "Salvando seu quiz", 
        icon: Database, 
        keyword: keywords.save_quiz
      });
    }

    return steps;
  }, [generatesFlashcards, generatesQuizzes]);
  
  const activeStepIndex = processingSteps.reduce((latestIndex, step, currentIndex) => {
    const isMatch = currentStepMessageLower.includes(step.keyword);
    if (isMatch) {
        return currentIndex;
    }
    return latestIndex;
  }, -1);
  
  const finalActiveIndex = activeStepIndex === -1 && !isCompleted ? 0 : activeStepIndex;

  const getTitle = () => {
    if (generatesFlashcards && generatesQuizzes) return "Gerando seu material de estudo";
    if (generatesFlashcards) return "Gerando seus flashcards";
    if (generatesQuizzes) return "Gerando seu quiz";
    return "Processando seu pedido";
  }

  const getSubtitle = () => {
    if (generatesFlashcards && generatesQuizzes) {
      return "Flashcards e quiz a sendo criados pela IA";
    }
    if (generatesFlashcards) {
      return "Flashcards a sendo criados pela IA";
    }
    if (generatesQuizzes) {
      return "Quiz sendo criado pela IA";
    }
    return "O seu conteúdo está sendo processado";
  }

  return (
    <div className="w-full max-w-md p-6">
      <div className="text-center mb-8 animate-in fade-in-50 slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <BrainCircuit className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {getTitle()}
        </h3>
        <p className="text-muted-foreground text-sm">
          {getSubtitle()}
        </p>
      </div>

      <ul className="space-y-3 mb-6">
        {processingSteps.map((step, index) => {
          let status: 'completed' | 'active' | 'pending' = 'pending';
          
          if (isCompleted) {
            status = 'completed';
          } else if (index < finalActiveIndex) {
            status = 'completed';
          } else if (index === finalActiveIndex) {
            status = 'active';
          }
          
          return (
            <li 
              key={step.name} 
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg transition-all duration-500",
                status === 'active' && "bg-accent"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                status === 'active' && 'bg-primary/10',
                status === 'completed' && 'bg-green-500/10',
                status === 'pending' && 'bg-muted'
              )}>
                {status === 'completed' && (
                  <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in-50 duration-300" />
                )}
                {status === 'active' && (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                )}
                {status === 'pending' && (
                  <step.icon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "font-medium text-sm transition-colors duration-300",
                  status === 'pending' && 'text-muted-foreground',
                  status === 'active' && 'text-foreground font-semibold',
                  status === 'completed' && 'text-muted-foreground'
                )}>
                  {step.name}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {isCompleted ? (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in-50 zoom-in-95 duration-500">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">
                Processamento concluído!
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecionando para a biblioteca...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Essa ação pode demorar alguns minutos. Por favor, não feche esta página.
        </p>
      )}
    </div>
  );
}