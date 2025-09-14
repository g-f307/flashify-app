// front/components/documents/review-deck-card.tsx

"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Sparkles } from "lucide-react";

interface ReviewDeckCardProps {
  reviewCount: number;
  onClick: () => void;
}

export function ReviewDeckCard({ reviewCount, onClick }: ReviewDeckCardProps) {
  if (reviewCount === 0) {
    return null; // Não mostra o cartão se não houver nada para rever
  }

  return (
    <div className="flex-shrink-0 py-4">
      <Card
        className="flex flex-col items-center justify-center h-full w-64 cursor-pointer transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 border-2 border-primary/50 bg-primary/5"
        onClick={onClick}
      >
        <CardHeader className="text-center p-6">
          <div className="relative mx-auto w-fit mb-2">
            <Brain className="w-10 h-10 mx-auto text-primary" />
            <Sparkles className="w-5 h-5 absolute -top-1 -right-2 text-yellow-400" />
          </div>
          <CardTitle>Revisão Inteligente</CardTitle>
          <CardDescription>
            {reviewCount} {reviewCount === 1 ? "card para reforçar" : "cards para reforçar"}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}