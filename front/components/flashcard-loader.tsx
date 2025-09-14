"use client";

import { CheckCircle, Loader2, FileText, BrainCircuit, Sparkles, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define as etapas do processo de forma estruturada, com palavras-chave para identificação
const processingSteps = [
  { name: "Iniciando processamento", icon: Sparkles, keywords: ["iniciando", "enviado"] },
  { name: "Extraindo texto", icon: FileText, keywords: ["extraindo", "extracting"] },
  { name: "Analisando conteúdo", icon: BrainCircuit, keywords: ["analisando", "enviando para a ia", "analyzing"] },
  { name: "Gerando flashcards", icon: Sparkles, keywords: ["gerando", "gerados", "generating", "creating"] },
  { name: "Salvando resultados", icon: Database, keywords: ["salvando", "saving", "concluído"] },
];

interface FlashcardLoaderProps {
  // Recebe a mensagem de status real do backend
  currentStepMessage?: string | null; // Tipagem ajustada para aceitar null
}

export default function FlashcardLoader({ currentStepMessage }: FlashcardLoaderProps) {
  // ▼▼▼ CORREÇÃO AQUI ▼▼▼
  // Garante que a mensagem seja uma string vazia se for nula ou indefinida
  const currentStepMessageLower = (currentStepMessage || "").toLowerCase();
  
  // Encontra o índice da etapa ativa com base nas palavras-chave
  let activeStepIndex = processingSteps.findIndex(step =>
    step.keywords.some(keyword => currentStepMessageLower.includes(keyword))
  );

  // Se nenhuma palavra-chave for encontrada, mas houver uma mensagem, assume a primeira etapa
  if (activeStepIndex === -1 && currentStepMessage) {
    activeStepIndex = 0;
  }
  
  // Verifica se o processo geral foi concluído
  const isCompleted = currentStepMessageLower.includes("concluído");

  return (
    <div className="w-full max-w-md p-4">
      <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
        Criando os seus flashcards...
      </h3>
      <p className="text-muted-foreground text-center mb-6">
        Acompanhe o progresso em tempo real abaixo.
      </p>
      <ul className="space-y-4">
        {processingSteps.map((step, index) => {
          // Determina o status de cada etapa (concluída, ativa ou pendente)
          let status: 'completed' | 'active' | 'pending' = 'pending';
          if (isCompleted) {
            status = 'completed';
          } else if (index < activeStepIndex) {
            status = 'completed';
          } else if (index === activeStepIndex) {
            status = 'active';
          }
          
          return (
            <li key={step.name} className="flex items-center gap-4 transition-all duration-300">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                status === 'active' ? 'bg-primary/20' : 'bg-muted'
              )}>
                {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500 animate-in fade-in zoom-in-50" />}
                {status === 'active' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                {status === 'pending' && <step.icon className="w-5 h-5 text-muted-foreground" />}
              </div>
              <span className={cn(
                "font-medium",
                status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
              )}>
                {step.name}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground text-center mt-6">
        Isto pode levar alguns minutos. Não feche esta página.
      </p>
    </div>
  );
}