// lib/performance-utils.ts

import type { FlashinhoExpressionVariant } from "./flashinho-expression";

export interface StudySession {
  flashcardId: number;
  accuracy: number; // 0.0 = Errei, 0.5 = Quase, 1.0 = Acertei
  timestamp: Date;
}

export interface PerformanceStats {
  totalCards: number;
  correctCards: number;
  partialCards: number;
  incorrectCards: number;
  accuracyPercentage: number;
  performanceLevel: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

export interface MotivationalMessage {
  title: string;
  subtitle: string;
  mascotVariant: FlashinhoExpressionVariant;
}

/**
 * Calcula as estatísticas de desempenho baseado nas respostas da sessão
 */
export function calculatePerformanceStats(sessions: StudySession[]): PerformanceStats {
  const totalCards = sessions.length;
  
  if (totalCards === 0) {
    return {
      totalCards: 0,
      correctCards: 0,
      partialCards: 0,
      incorrectCards: 0,
      accuracyPercentage: 0,
      performanceLevel: 'needs_improvement'
    };
  }

  const correctCards = sessions.filter(s => s.accuracy === 1.0).length;
  const partialCards = sessions.filter(s => s.accuracy === 0.5).length;
  const incorrectCards = sessions.filter(s => s.accuracy === 0.0).length;

  // Calcula a porcentagem considerando respostas parciais como 50% de acerto
  const weightedScore = sessions.reduce((sum, session) => sum + session.accuracy, 0);
  const accuracyPercentage = Math.round((weightedScore / totalCards) * 100);

  // Determina o nível de desempenho
  let performanceLevel: PerformanceStats['performanceLevel'];
  if (accuracyPercentage >= 90) {
    performanceLevel = 'excellent';
  } else if (accuracyPercentage >= 75) {
    performanceLevel = 'good';
  } else if (accuracyPercentage >= 60) {
    performanceLevel = 'average';
  } else {
    performanceLevel = 'needs_improvement';
  }

  return {
    totalCards,
    correctCards,
    partialCards,
    incorrectCards,
    accuracyPercentage,
    performanceLevel
  };
}

/**
 * Retorna uma mensagem motivacional baseada no nível de desempenho
 */
export function getMotivationalMessage(performanceLevel: PerformanceStats['performanceLevel'], accuracyPercentage: number): MotivationalMessage {
  const messages: Record<PerformanceStats['performanceLevel'], MotivationalMessage[]> = {
    excellent: [
      {
        title: "Excelente trabalho!",
        subtitle: "Você dominou este conteúdo. Continue assim!",
        mascotVariant: "amei"
      },
      {
        title: "Perfeito!",
        subtitle: "Seu desempenho foi excepcional. Parabéns!",
        mascotVariant: "amei"
      },
      {
        title: "Fantástico!",
        subtitle: "Você realmente entende este material muito bem.",
        mascotVariant: "amei"
      }
    ],
    good: [
      {
        title: "Bom trabalho!",
        subtitle: "Experimente algumas questões para revisão no Aprender.",
        mascotVariant: "boa"
      },
      {
        title: "Muito bem!",
        subtitle: "Você está no caminho certo. Continue praticando!",
        mascotVariant: "boa"
      },
      {
        title: "Ótimo progresso!",
        subtitle: "Seu esforço está dando resultado. Parabéns!",
        mascotVariant: "boa"
      }
    ],
    average: [
      {
        title: "Bom começo!",
        subtitle: "Continue praticando para melhorar ainda mais.",
        mascotVariant: "ok"
      },
      {
        title: "No caminho certo!",
        subtitle: "Com mais prática você vai dominar este conteúdo.",
        mascotVariant: "ok"
      },
      {
        title: "Progredindo bem!",
        subtitle: "Cada sessão de estudo te deixa mais próximo do sucesso.",
        mascotVariant: "ok"
      }
    ],
    needs_improvement: [
      {
        title: "Continue tentando!",
        subtitle: "A prática leva à perfeição. Não desista!",
        mascotVariant: "ruim"
      },
      {
        title: "Você consegue!",
        subtitle: "Revise o material e tente novamente. Você vai melhorar!",
        mascotVariant: "ruim"
      },
      {
        title: "Persistência é a chave!",
        subtitle: "Cada erro é uma oportunidade de aprender algo novo.",
        mascotVariant: "ruim"
      }
    ]
  };

  const levelMessages = messages[performanceLevel];
  const randomIndex = Math.floor(Math.random() * levelMessages.length);
  return levelMessages[randomIndex];
}

/**
 * Gera recomendações de ação baseadas no desempenho
 */
export function getActionRecommendations(stats: PerformanceStats): {
  primaryAction: string;
  secondaryAction: string;
  showReviewOption: boolean;
} {
  const { performanceLevel, incorrectCards, partialCards } = stats;

  switch (performanceLevel) {
    case 'excellent':
      return {
        primaryAction: "Explorar novo conteúdo",
        secondaryAction: "Revisar rapidamente",
        showReviewOption: false
      };
    
    case 'good':
      return {
        primaryAction: "Praticar com questões",
        secondaryAction: `Revisar ${incorrectCards + partialCards} flashcards`,
        showReviewOption: true
      };
    
    case 'average':
      return {
        primaryAction: "Revisar conteúdo",
        secondaryAction: `Estudar novamente ${incorrectCards + partialCards} termos`,
        showReviewOption: true
      };
    
    case 'needs_improvement':
      return {
        primaryAction: "Estudar novamente",
        secondaryAction: "Revisar todo o material",
        showReviewOption: true
      };
    
    default:
      return {
        primaryAction: "Continuar estudando",
        secondaryAction: "Revisar material",
        showReviewOption: true
      };
  }
}

/**
 * Formata o tempo de estudo em uma string legível
 */
export function formatStudyTime(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (diffMinutes > 0) {
    return `${diffMinutes}min ${diffSeconds}s`;
  } else {
    return `${diffSeconds}s`;
  }
}
