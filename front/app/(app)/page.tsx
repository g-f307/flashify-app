"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Library, Loader2 } from "lucide-react";
import { apiClient, Document } from "@/lib/api";
import { RecentDocumentCard } from "@/components/documents/recent-document-card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

// Interface para incluir a contagem total de flashcards
export interface DocumentWithCount extends Document {
  total_flashcards: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentDocuments, setRecentDocuments] = useState<DocumentWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoading(true);
        const allDocs = await apiClient.getDocuments();
        
        // CORREÇÃO: Busca a contagem de flashcards e cria o objeto correto
        const docsWithDetails = await Promise.all(
          allDocs.map(async (doc) => {
            let count = 0;
            if (doc.status === 'COMPLETED') {
              try {
                const flashcards = await apiClient.getDocumentFlashcards(doc.id);
                count = flashcards.length;
              } catch { /* ignora erros para não quebrar a UI */ }
            }
            return { ...doc, total_flashcards: count };
          })
        );

        const sortedDocs = docsWithDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentDocuments(sortedDocs.slice(0, 5));

      } catch (error) {
        console.error("Falha ao buscar documentos recentes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchRecent();
    }
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Secção de Boas-Vindas e Ações Rápidas */}
      <section className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Bem-vindo(a), {user?.username}!
        </h2>
        <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4 mt-2">
          Pronto para começar? Crie um novo conjunto ou continue de onde parou.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-2xl mx-auto">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow group card-enhanced glow-on-hover"
            onClick={() => router.push("/create")}
          >
            <CardHeader className="text-center p-6">
              <Plus className="w-10 h-10 mx-auto text-primary mb-2" />
              <CardTitle>Criar Novo Conjunto</CardTitle>
              <CardDescription>Use o nosso assistente para gerar flashcards personalizados.</CardDescription>
            </CardHeader>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow group card-enhanced glow-on-hover"
            onClick={() => router.push("/library")}
          >
            <CardHeader className="text-center p-6">
              <Library className="w-10 h-10 mx-auto text-primary mb-2" />
              <CardTitle>Ver Biblioteca Completa</CardTitle>
              <CardDescription>Revise todos os seus conjuntos de flashcards existentes.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Secção de Conjuntos Recentes */}
      <section>
        <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4">Conjuntos Recentes</h3>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recentDocuments.length > 0 ? (
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto p-4 scrollbar-hide w-full">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex-shrink-0">
                  <RecentDocumentCard document={doc} />
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/library")}
              >
                Acessar Biblioteca
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Nenhum conjunto recente encontrado.</p>
            <p className="text-muted-foreground mt-1">Crie o seu primeiro conjunto para vê-lo aqui!</p>
          </div>
        )}
      </section>
    </div>
  );
}