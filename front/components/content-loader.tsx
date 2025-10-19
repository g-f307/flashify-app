"use client";

import { CheckCircle, Loader2, FileText, BrainCircuit, Sparkles, Database, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// Palavras-chave exatas que o backend envia no campo 'current_step'
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
  
  // 'useMemo' para evitar recriar a lista de passos em cada renderização
  const processingSteps = useMemo(() => {
    const steps = [];
    steps.push({ name: "Iniciando processamento", icon: Sparkles, keyword: keywords.start });
    steps.push({ name: "A extrair texto do ficheiro", icon: FileText, keyword: keywords.extract });
    
    if (generatesFlashcards) {
      steps.push({ name: "IA a gerar flashcards", icon: BrainCircuit, keyword: keywords.ai_flashcards });
      steps.push({ name: "A estruturar flashcards", icon: Sparkles, keyword: keywords.parse_flashcards });
      steps.push({ name: "A guardar flashcards", icon: Database, keyword: keywords.save_flashcards });
    }

    if (generatesQuizzes) {
      steps.push({ name: "IA a gerar quiz", icon: BrainCircuit, keyword: keywords.ai_quiz });
      steps.push({ name: "A estruturar quiz", icon: ClipboardCheck, keyword: keywords.parse_quiz });
      steps.push({ name: "A guardar quiz", icon: Database, keyword: keywords.save_quiz });
    }

    return steps;
  }, [generatesFlashcards, generatesQuizzes]);

  const currentStepMessageLower = (currentStepMessage || "").toLowerCase();
  
  // Lógica de detecção do passo ativo: encontra o último passo cuja palavra-chave
  // está contida na mensagem atual do backend.
  const activeStepIndex = processingSteps.reduce((latestIndex, step, currentIndex) => {
    const isMatch = currentStepMessageLower.includes(step.keyword);
    if (isMatch) {
        return currentIndex;
    }
    return latestIndex;
  }, -1);
  
  const isCompleted = currentStepMessageLower.includes(keywords.done);

  // Fallback: Se activeStepIndex for -1 (nenhuma palavra-chave encontrada), 
  // mas o processamento estiver ativo, assumimos o primeiro passo.
  // Isso garante que o ícone de carregamento apareça imediatamente.
  const finalActiveIndex = activeStepIndex === -1 && !isCompleted ? 0 : activeStepIndex;

  const getTitle = () => {
    if (generatesFlashcards && generatesQuizzes) return "A gerar o seu material de estudo";
    if (generatesFlashcards) return "A gerar os seus flashcards";
    if (generatesQuizzes) return "A gerar o seu quiz";
    return "A processar o seu pedido";
  }

  const getSubtitle = () => {
    if (generatesFlashcards && generatesQuizzes) {
      return "Flashcards e quiz a serem criados pela IA";
    }
    if (generatesFlashcards) {
      return "Flashcards a serem criados pela IA";
    }
    if (generatesQuizzes) {
      return "Quiz a ser criado pela IA";
    }
    return "O seu conteúdo está a ser processado";
  }

  return (
    <div className="w-full max-w-md p-4">
      <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
        {getTitle()}
      </h3>
      <p className="text-muted-foreground text-center mb-6">
        {getSubtitle()}
      </p>
      <ul className="space-y-4">
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
            <li key={step.name} className="flex items-center gap-4 transition-all duration-300">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                status === 'active' ? 'bg-primary/20' : 'bg-muted'
              )}>
                {status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500 animate-in fade-in zoom-in-50 duration-300" />
                )}
                {status === 'active' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {status === 'pending' && (
                  <step.icon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                "font-medium transition-colors",
                status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
              )}>
                {step.name}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground text-center mt-6">
        Isto pode demorar alguns minutos. Não feche esta página.
      </p>
      
      {isCompleted && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm text-center text-green-600 dark:text-green-400 font-medium">
            ✅ Processamento concluído com sucesso!
          </p>
        </div>
      )}
    </div>
  );
}