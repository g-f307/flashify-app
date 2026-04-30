import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Sparkles, Library, TrendingUp } from "lucide-react";
import { LimitExceededError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LimitReachedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  limitInfo: LimitExceededError;
}

export function LimitReachedDialog({ isOpen, onClose, limitInfo }: LimitReachedDialogProps) {
  const router = useRouter();
  const { used, limit, hours_until_reset } = limitInfo;

  const handleGoToLibrary = () => {
    onClose();
    router.push('/library');
  };

  const handleGoToProgress = () => {
    onClose();
    router.push('/progress');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[#FFC300] to-[#6BDEF3] rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          
          <AlertDialogTitle className="text-center text-xl">
            Limite Diário Atingido
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                Você criou <strong className="text-primary">{used} decks</strong> hoje.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Seu limite será renovado em <strong>{hours_until_reset} horas</strong></span>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-sm font-medium">Enquanto isso, que tal:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Library className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Revisar os <strong>{used} decks</strong> que você criou hoje</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Conferir seu progresso e estatísticas de estudo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Praticar com os quizzes que já tem disponíveis</span>
                </li>
              </ul>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs">
              <p className="text-primary font-medium">Dica</p>
              <p className="text-muted-foreground mt-1">
                A repetição espaçada funciona melhor do que criar muitos decks de uma vez. 
                Use hoje para consolidar o que já aprendeu!
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleGoToProgress}
            className="w-full sm:w-auto"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Ver Progresso
          </Button>
          <AlertDialogAction
            onClick={handleGoToLibrary}
            className="w-full sm:w-auto bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] hover:opacity-90"
          >
            <Library className="w-4 h-4 mr-2" />
            Ir para Biblioteca
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
