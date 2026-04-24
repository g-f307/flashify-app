"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Calendar, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SRS_ONBOARDING_KEY = "flashify_srs_onboarding_shown";

interface SrsOnboardingModalProps {
  /** Trigger a mostragem do modal (ex: após a primeira sessão de estudo) */
  show: boolean;
}

export function SrsOnboardingModal({ show }: SrsOnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    
    // Verificar se já foi mostrado
    const alreadyShown = localStorage.getItem(SRS_ONBOARDING_KEY);
    if (alreadyShown) return;

    // Mostrar com delay para não competir com outras animações
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [show]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(SRS_ONBOARDING_KEY, "true");
  };

  const steps = [
    {
      icon: Brain,
      title: "Revisões automáticas",
      description: "O Flashify agenda revisões dos cards que você estudou — priorizando os que mais precisa praticar.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: TrendingUp,
      title: "Se adapta a você",
      description: "Cards que você acertou aparecem com menos frequência. Cards que errou voltam mais rápido.",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Calendar,
      title: "Volte amanhã",
      description: "Para fixar a memória de longo prazo, revise seus cards quando o sistema indicar. Consistência é a chave!",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="relative max-w-md w-full p-6 shadow-2xl border-primary/20">
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-1">Revisão Inteligente ativada</h2>
                <p className="text-sm text-muted-foreground">
                  Seu progresso agora é rastreado pelo sistema de memorização
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.15 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${step.bgColor}`}>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button onClick={handleDismiss} className="w-full" size="lg">
                Entendi, bora estudar!
              </Button>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
