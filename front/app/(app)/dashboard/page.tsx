"use client";

import { useEffect, useState, useTransition } from "react";
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
import { toast } from "sonner";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchRecent = async () => {
    try {
      const allDocs = await apiClient.getDocuments();
      const sortedDocs = allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentDocuments(sortedDocs.slice(0, 5));
    } catch (error) {
      console.error("Falha ao buscar decks recentes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchRecent();
    }
  }, [user]);

  const handleDocumentSelect = (doc: Document) => {
    router.push(`/deck/${doc.id}`);
  };

  const handleDelete = async (deletedId: number) => {
    try {
      await apiClient.deleteDocument(deletedId);
      toast.success("Deck excluído com sucesso!");
      setRecentDocuments(currentDocs => 
        currentDocs.filter(doc => doc.id !== deletedId)
      );
    } catch (error: any) {
      toast.error("Falha ao excluir o deck", { description: error.message });
    }
  };

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center justify-center gap-2 flex-wrap">
          Bem-vindo(a),
          <AnimatedGradientText className="text-2xl lg:text-3xl font-bold">
            {user?.username}!
          </AnimatedGradientText>
        </h1>
      </section>

      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold">Como Funciona</h2>
          <p className="text-muted-foreground mt-1">Transforme qualquer conteúdo em material de estudo inteligente.</p>
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
              title="2. IA Cria Flashcards e Quizzes"
              description="A nossa Inteligência Artificial analisa o seu material e cria flashcards e quizzes relevantes automaticamente."
            />
            <InfoCard
              illustration={<BrainCircuit className="h-10 w-10 text-primary" />}
              title="3. Estude de Forma Eficaz"
              description="Reveja os flashcards, teste os seus conhecimentos com quizzes e memorize o conteúdo mais rapidamente."
            />
          </div>
        </div>
        
        <div className="text-center mt-8">
          <Button size="lg" onClick={() => startTransition(() => router.push("/create"))}>
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Criar Novo Deck'}
            {!isPending && <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>
      </section>
      
      {recentDocuments.length > 0 && (
        <>
          <Separator className="bg-border" />
          
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
                              <div key={doc.id} className="flex-shrink-0 w-full basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 py-4">
                                  <RecentDocumentCard
                                    document={doc}
                                    onSelect={() => handleDocumentSelect(doc)}
                                    onDelete={() => handleDelete(doc.id)} 
                                    onUpdate={fetchRecent}
                                  />
                              </div>
                          ))}

                          <div className="flex-shrink-0 w-full basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 flex items-stretch py-4">
                              <Card
                                className="flex flex-col items-center justify-center h-full w-full cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => router.push("/library")}
                              >
                                <CardHeader className="text-center p-6">
                                  <Library className="w-10 h-10 mx-auto text-primary mb-2" />
                                  <CardTitle>Acessar à Biblioteca</CardTitle>
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