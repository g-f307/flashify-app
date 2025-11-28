"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, ChevronLeft, ChevronRight, FileUp, MessageSquare, BrainCircuit, Library } from "lucide-react";
import { apiClient, Document } from "@/lib/api";
import { RecentDocumentCard } from "@/components/documents/recent-document-card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Componente do Carrosel
const CarouselSection = ({ onCreateClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const slides = [
    {
      icon: FileUp,
      title: "1. Envie o seu Conteúdo",
      description: "Faça o upload de um PDF, imagem ou simplesmente cole um texto que deseja estudar.",
      color: "text-[#FACC15]"
    },
    {
      icon: MessageSquare,
      title: "2. IA Cria Flashcards e Quizzes",
      description: "A nossa Inteligência Artificial analisa o seu material e cria flashcards e quizzes relevantes automaticamente.",
      color: "text-[#48cfea]"
    },
    {
      icon: BrainCircuit,
      title: "3. Estude de Forma Eficaz",
      description: "Reveja os flashcards, teste os seus conhecimentos com quizzes e memorize o conteúdo mais rapidamente.",
      color: "text-[#FACC15]"
    }
  ];

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold">Como Funciona</h2>
        <p className="text-muted-foreground mt-1">Transforme qualquer conteúdo em material de estudo inteligente.</p>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Carrosel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-gray-200 dark:border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 ${
                  slides[currentSlide].color === "text-[#FACC15]" ? "bg-[#FACC15]/10" :
                  "bg-[#48cfea]/10"
                }`}>
                  {(() => {
                    const Icon = slides[currentSlide].icon;
                    return <Icon className={`w-6 h-6 ${slides[currentSlide].color}`} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground mb-1">
                    {slides[currentSlide].title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {slides[currentSlide].description}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Botões de navegação e indicadores */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prevSlide}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground active:bg-accent/50"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide
                      ? 'bg-primary w-6 h-1.5'
                      : 'bg-muted hover:bg-muted-foreground/30 w-1.5 h-1.5'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground active:bg-accent/50"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTA Button - Destaque */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-8"
        >
          <Button 
            size="lg" 
            onClick={onCreateClick}
            className="shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Criar Novo Deck
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Comece em menos de 2 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
};

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
      {/* Seção Como Funciona com Carrosel */}
      <CarouselSection onCreateClick={() => startTransition(() => router.push("/create"))} />

      {/* Seção de Decks Recentes */}
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
                  <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
                    {recentDocuments.map((doc) => (
                      <div key={doc.id} className="flex-shrink-0 w-[280px] snap-start">
                        <RecentDocumentCard
                          document={doc}
                          onSelect={() => handleDocumentSelect(doc)}
                          onDelete={() => handleDelete(doc.id)} 
                          onUpdate={fetchRecent}
                        />
                      </div>
                    ))}

                    <div className="flex-shrink-0 w-[280px] snap-start">
                      <Card
                        className="flex flex-col items-center justify-center h-[280px] w-full cursor-pointer hover:shadow-lg transition-shadow"
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