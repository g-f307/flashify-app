"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { Document } from "@/lib/api";
import { FileText, Loader2 } from "lucide-react";
import TimeAgo from "../common/time-ago";

interface RecentDocumentCardProps {
  document: Document;
}

export function RecentDocumentCard({ document }: RecentDocumentCardProps) {
  const router = useRouter();

  const handleStudy = () => {
    if (document.status === 'COMPLETED') {
      router.push(`/study/${document.id}`);
    }
  };

  // Lógica aprimorada para extrair um nome de exibição limpo
  const displayName = document.file_path.startsWith('uploads/')
    ? document.file_path.split('/').pop()?.replace(/_/g, ' ').replace(/\.[^/.]+$/, "")
    : document.file_path || "Deck de Estudo";

  const progressPercentage = document.total_flashcards > 0 
    ? Math.round((document.studied_flashcards / document.total_flashcards) * 100) 
    : 0;

  return (
    <Card className="flex flex-col h-full w-64 card-enhanced transition-all hover:-translate-y-1 glow-on-hover">
      <CardHeader>
        <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
            {/* Wrapper que permite que o título seja cortado (truncate) se for muito longo */}
            <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate" title={displayName}>
                    {displayName}
                </CardTitle>
                <CardDescription className="mt-1">
                    Criado <TimeAgo date={document.created_at} />
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{document.status === 'COMPLETED' ? 'Progresso' : 'Criação'}</span>
            <span>{document.status === 'COMPLETED' ? `${progressPercentage}%` : `${document.processing_progress || 0}%`}</span>
          </div>
          <Progress value={document.status === 'COMPLETED' ? progressPercentage : (document.processing_progress || 0)} className="h-2" />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant="secondary"
          onClick={handleStudy}
          disabled={document.status !== 'COMPLETED'}
        >
          {document.status === 'PROCESSING' 
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> A processar</> 
            : 'Iniciar'
          }
        </Button>
      </CardFooter>
    </Card>
  );
}