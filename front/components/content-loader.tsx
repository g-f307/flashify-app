"use client";

import { CheckCircle, Loader2, FileText, BrainCircuit, Sparkles, Database, ClipboardCheck, Map } from 'lucide-react';
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
  guided: "gerando estudo guiado",
  save_guided: "salvando estudo guiado",
  done: "concluído",
};

interface ContentLoaderProps {
  currentStepMessage?: string | null;
  generatesFlashcards: boolean;
  generatesQuizzes: boolean;
  generatesGuided: boolean;
}

export default function ContentLoader({ 
  currentStepMessage, 
  generatesFlashcards, 
  generatesQuizzes,
  generatesGuided,
}: ContentLoaderProps) {
  
  const currentStepMessageLower = (currentStepMessage || "").toLowerCase();
  const isCompleted = currentStepMessageLower.includes(keywords.done);
  
  const processingSteps = useMemo(() => {
    const steps = [];
    steps.push({ 
      name: "Iniciando processamento", 
      icon: Sparkles, 
      keyword: keywords.start,
      tone: "neutral",
    });
    steps.push({ 
      name: "Extraindo texto do arquivo", 
      icon: FileText, 
      keyword: keywords.extract,
      tone: "neutral",
    });
    
    if (generatesFlashcards) {
      steps.push({ 
        name: "Gerando seus flashcards", 
        icon: BrainCircuit, 
        keyword: keywords.ai_flashcards,
        tone: "flashcards",
      });
      steps.push({ 
        name: "Estruturando seus flashcards", 
        icon: Sparkles, 
        keyword: keywords.parse_flashcards,
        tone: "flashcards",
      });
      steps.push({ 
        name: "Salvando seus flashcards", 
        icon: Database, 
        keyword: keywords.save_flashcards,
        tone: "flashcards",
      });
    }

    if (generatesQuizzes) {
      steps.push({ 
        name: "Gerando seu quiz", 
        icon: BrainCircuit, 
        keyword: keywords.ai_quiz,
        tone: "quiz",
      });
      steps.push({ 
        name: "Estruturando seu quiz", 
        icon: ClipboardCheck, 
        keyword: keywords.parse_quiz,
        tone: "quiz",
      });
      steps.push({ 
        name: "Salvando seu quiz", 
        icon: Database, 
        keyword: keywords.save_quiz,
        tone: "quiz",
      });
    }

    if (generatesGuided) {
      steps.push({
        name: "Montando seu estudo guiado",
        icon: Map,
        keyword: keywords.guided,
        tone: "guided",
      });
      steps.push({
        name: "Salvando sua trilha guiada",
        icon: Database,
        keyword: keywords.save_guided,
        tone: "guided",
      });
    }

    return steps;
  }, [generatesFlashcards, generatesGuided, generatesQuizzes]);
  
  const activeStepIndex = processingSteps.reduce((latestIndex, step, currentIndex) => {
    const isMatch = currentStepMessageLower.includes(step.keyword);
    if (isMatch) {
        return currentIndex;
    }
    return latestIndex;
  }, -1);
  
  const finalActiveIndex = activeStepIndex === -1 && !isCompleted ? 0 : activeStepIndex;

  const getTitle = () => {
    if (generatesFlashcards && generatesQuizzes && generatesGuided) {
      return "Gerando seu pacote completo de estudo";
    }
    if (generatesFlashcards && generatesQuizzes) return "Gerando seu material de estudo";
    if (generatesFlashcards) return "Gerando seus flashcards";
    if (generatesQuizzes) return "Gerando seu quiz";
    return "Processando seu pedido";
  }

  const getSubtitle = () => {
    if (generatesFlashcards && generatesQuizzes && generatesGuided) {
      return "Flashcards, quiz e estudo guiado estão sendo preparados para você";
    }
    if (generatesFlashcards && generatesQuizzes) {
      return "Flashcards e quiz estão sendo criados pela IA";
    }
    if (generatesFlashcards) {
      return "Flashcards estão sendo criados pela IA";
    }
    if (generatesQuizzes) {
      return "Quiz sendo criado pela IA";
    }
    return "O seu conteúdo está sendo processado";
  }

  const getToneClasses = (tone: string, status: 'completed' | 'active' | 'pending') => {
    if (status === "completed") {
      return {
        panel: "border-emerald-500/20 bg-emerald-500/8 dark:border-emerald-500/15 dark:bg-emerald-500/8",
        iconWrap: "bg-emerald-500/12 dark:bg-emerald-500/10",
        icon: "text-emerald-500",
      };
    }

    if (status === "pending") {
      return {
        panel: "border-gray-200 bg-card dark:border-zinc-700/50 dark:bg-card",
        iconWrap: "bg-muted dark:bg-muted/70",
        icon: "text-muted-foreground",
      };
    }

    if (tone === "flashcards") {
      return {
        panel: "border-[#FACC15]/25 bg-[#FACC15]/8 dark:border-[#FACC15]/18 dark:bg-[#FACC15]/8",
        iconWrap: "bg-[#FACC15]/14 dark:bg-[#FACC15]/10",
        icon: "text-[#9b7200] dark:text-[#f0d46b]",
      };
    }

    if (tone === "quiz") {
      return {
        panel: "border-[#48cfea]/25 bg-[#48cfea]/8 dark:border-[#48cfea]/18 dark:bg-[#48cfea]/8",
        iconWrap: "bg-[#48cfea]/14 dark:bg-[#48cfea]/10",
        icon: "text-[#0f7d97] dark:text-[#85e3fb]",
      };
    }

    if (tone === "guided") {
      return {
        panel: "border-[#7FD9A0]/25 bg-[#7FD9A0]/8 dark:border-[#7FD9A0]/18 dark:bg-[#7FD9A0]/8",
        iconWrap: "bg-[#7FD9A0]/14 dark:bg-[#7FD9A0]/10",
        icon: "text-[#2f8150] dark:text-[#9be3b4]",
      };
    }

    return {
      panel: "border-gray-200 bg-muted/35 dark:border-zinc-700/50 dark:bg-muted/20",
      iconWrap: "bg-background dark:bg-background/80",
      icon: "text-foreground",
    };
  };

  return (
    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-card p-6 shadow-sm dark:border-zinc-800/60 dark:shadow-none">
      <div className="text-center mb-8 animate-in fade-in-50 slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
          <BrainCircuit className="w-8 h-8 text-muted-foreground" />
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

          const toneClasses = getToneClasses(step.tone, status);
          
          return (
            <li 
              key={step.name} 
              className={cn(
                "flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-500",
                toneClasses.panel
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-[1rem] transition-all duration-300",
                toneClasses.iconWrap
              )}>
                {status === 'completed' && (
                  <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in-50 duration-300" />
                )}
                {status === 'active' && (
                  <Loader2 className={cn("w-6 h-6 animate-spin", toneClasses.icon)} />
                )}
                {status === 'pending' && (
                  <step.icon className={cn("w-6 h-6", toneClasses.icon)} />
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
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 animate-in fade-in-50 zoom-in-95 duration-500 dark:border-emerald-500/15 dark:bg-emerald-500/8">
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
