"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Loader2 } from "lucide-react";
import { DocumentWithCount } from "./document-list"; // Importa a interface partilhada

interface RecentDocumentCardProps {
  document: DocumentWithCount;
}

export function RecentDocumentCard({ document }: RecentDocumentCardProps) {
  const router = useRouter();

  const handleStudy = () => {
    if (document.status === 'COMPLETED') {
      router.push(`/study/${document.id}`);
    }
  };

  const displayName = document.file_path.split('/').pop()?.replace(/_/g, ' ') || "Conjunto de Estudo";

  const studiedCount = document.studied_flashcard_ids?.length || 0;
  const totalCount = document.total_flashcards;
  const progressPercentage = totalCount > 0 ? Math.round((studiedCount / totalCount) * 100) : 0;

  return (
    <Card className="flex flex-col h-full w-64 card-enhanced transition-all hover:-translate-y-1 glow-on-hover">
      <CardHeader>
        <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary" />
            <CardTitle className="text-lg truncate" title={displayName}>
                {displayName}
            </CardTitle>
        </div>
        <CardDescription>
            Criado {formatDistanceToNow(new Date(document.created_at), { addSuffix: true, locale: ptBR })}
        </CardDescription>
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