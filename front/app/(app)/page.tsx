"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileUp, MessageSquare, BrainCircuit, Library, ArrowRight } from "lucide-react";
import { apiClient, Document } from "@/lib/api";
import { RecentDocumentCard } from "@/components/documents/recent-document-card";
import { Separator } from "@/components/ui/separator";
import AnimatedGradientText from "@/components/ui/animated-gradient-text";
import { InfoCard } from "@/components/info-card";
import { Button } from "@/components/ui/button";

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
        
        // A lógica de buscar a contagem de flashcards foi movida para o backend, simplificando o frontend.
        // O endpoint /documents/ agora retorna 'total_flashcards'.
        const sortedDocs = allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentDocuments(sortedDocs.slice(0, 5));

      } catch (error) {
        console.error("Falha ao buscar decks recentes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchRecent();
    }
  }, [user]);

  return (
    <div className="space-y-12">
      {/* 1. Secção de Boas-Vindas */}
      <section className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center justify-center gap-2 flex-wrap">
          Bem-vindo(a),
          <AnimatedGradientText className="text-2xl lg:text-3xl font-bold">
            {user?.username}!
          </AnimatedGradientText>
        </h1>
      </section>

      {/* 2. Secção "Como Funciona" com InfoCards */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold">Como Funciona</h2>
          <p className="text-muted-foreground mt-1">Em três simples passos, o seu estudo fica mais inteligente.</p>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <InfoCard
              illustration={<FileUp className="h-10 w-10 text-primary" />}
              title="1. Envie o seu Conteúdo"
              description="Faça o upload de um PDF, imagem ou simplesmente cole um texto que deseja estudar."
            />
            <InfoCard
              illustration={<MessageSquare className="h-10 w-10 text-primary" />}
              title="2. Geração com IA"
              description="A nossa Inteligência Artificial analisa o seu material e cria flashcards relevantes automaticamente."
            />
            <InfoCard
              illustration={<BrainCircuit className="h-10 w-10 text-primary" />}
              title="3. Estude de Forma Eficaz"
              description="Reveja os seus novos flashcards, acompanhe o seu progresso e memorize o conteúdo mais rapidamente."
            />
          </div>
        </div>
        
        {/* 🔽 ALTERAÇÃO: Botão sempre visível e com novo texto 🔽 */}
        <div className="text-center mt-8">
          <Button size="lg" onClick={() => router.push('/create')}>
            Criar Novo Deck
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      
      {/* Apenas mostra o separador e a secção se existirem decks recentes */}
      {recentDocuments.length > 0 && (
        <>
          {/* 🔽 ALTERAÇÃO: Separador com cor ajustada (bg-border) 🔽 */}
          <Separator className="bg-border" />
          
          {/* 3. Secção de Decks Recentes */}
          <section>
            <div className="max-w-5xl mx-auto">
                <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4">Continue de onde parou</h3>
                {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                ) : (
                <div className="relative">
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                        {recentDocuments.map((doc) => (
                            <div key={doc.id} className="flex-shrink-0 py-4">
                                <RecentDocumentCard document={doc} />
                            </div>
                        ))}
                        <div className="flex-shrink-0 flex items-stretch py-4">
                            <Card
                            className="flex flex-col items-center justify-center h-full w-64 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => router.push("/library")}
                            >
                            <CardHeader className="text-center p-6">
                                <Library className="w-10 h-10 mx-auto text-primary mb-2" />
                                <CardTitle>Aceder à Biblioteca</CardTitle>
                                {/* 🔽 ALTERAÇÃO: Terminologia para "decks" 🔽 */}
                                <CardDescription>Ver todos os seus decks</CardDescription>
                            </CardHeader>
                            </Card>
                        </div>
                    </div>
                </div>
                )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}