// front/app/(app)/deck/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document, Flashcard } from "@/lib/api";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardFooter, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BrainCircuit, FileText, Loader2, AlertTriangle, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { toast } from "sonner";

// Componente para um cartão de estatística
const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
    </div>
);


export default function DeckDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = Number(params.id);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [isCreatingFlashcards, setIsCreatingFlashcards] = useState(false);

    const fetchDocumentDetails = async () => {
        if (!documentId) return;
        setIsLoading(true);
        try {
            const doc = await apiClient.getDocument(documentId);
            setDocument(doc);
        } catch (err) {
            setError("Não foi possível encontrar este deck. Verifique se o link está correto.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(documentId) fetchDocumentDetails();
    }, [documentId]);
    
    const handleCreateQuiz = async () => {
        if (!document) {
            toast.error("Documento não carregado.");
            return;
        }

        setIsCreatingQuiz(true);
        toast.info("A IA está a gerar o seu quiz...", {
            description: "Isto pode levar um momento. A página será atualizada quando estiver pronto.",
        });

        try {
            await apiClient.generateQuizForDocument(document.id);
            await fetchDocumentDetails();
            toast.success("Quiz gerado com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao gerar o quiz", {
                description: error.message || "Tente novamente mais tarde."
            });
        } finally {
            setIsCreatingQuiz(false);
        }
    }

    const handleCreateFlashcards = async () => {
        if (!document) return;
        setIsCreatingFlashcards(true);
        toast.info("A IA está a gerar os seus flashcards...", {
            description: "Isto pode levar um momento. A página será atualizada quando estiver pronto.",
        });

        try {
            await apiClient.generateFlashcardsForDocument(document.id);
            await fetchDocumentDetails();
            toast.success("Flashcards gerados com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao gerar os flashcards", {
                description: error.message || "Tente novamente mais tarde."
            });
        } finally {
            setIsCreatingFlashcards(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-center">
                <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Ocorreu um Erro</h1>
                <p className="text-muted-foreground mt-2">{error || "Deck não encontrado."}</p>
                <Button asChild className="mt-6">
                    <Link href="/library">Voltar para a Biblioteca</Link>
                </Button>
            </div>
        );
    }

    const studyProgress = document.total_flashcards > 0 
        ? (document.studied_flashcards / document.total_flashcards) * 100 
        : 0;

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-500">
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/library"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Link>
                </Button>
            </div>

            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{document.file_path}</h1>
                <p className="text-muted-foreground mt-2">Escolha a sua atividade de estudo para este deck.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {/* Card de Flashcards */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg"><FileText className="w-6 h-6 text-primary" /></div>
                            <div>
                                <CardTitle className="text-2xl">Flashcards</CardTitle>
                                <CardDescription>Reveja os conceitos chave.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        {document.total_flashcards > 0 ? (
                            <>
                                <StatCard label="Total de Flashcards" value={document.total_flashcards} />
                                <StatCard label="Progresso de Estudo" value={`${Math.round(studyProgress)}%`} />
                                <Progress value={studyProgress} className="h-2" />
                            </>
                        ) : (
                             <div className="text-center text-muted-foreground py-4">
                                <p>Ainda não existem flashcards para este deck.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {document.total_flashcards > 0 ? (
                            <Button className="w-full" asChild>
                                <Link href={`/study/${document.id}`}>Iniciar Estudos</Link>
                            </Button>
                        ) : (
                            <Button 
                                className="w-full" 
                                onClick={handleCreateFlashcards}
                                disabled={isCreatingFlashcards}
                            >
                                {isCreatingFlashcards ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A gerar flashcards...</>
                                ) : (
                                    <><Wand2 className="w-4 h-4 mr-2" /> Gerar Flashcards com IA</>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                {/* Card de Quiz */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-secondary/10 rounded-lg">
                                <BrainCircuit className="w-6 h-6 text-secondary-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Quiz</CardTitle>
                                <CardDescription>Teste os seus conhecimentos.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        {document.has_quiz && document.quiz ? (
                            <>
                                <StatCard label="Nº de Perguntas" value={document.quiz.questions.length} />
                                <StatCard label="Estado" value="Pronto para iniciar" />
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground py-4">
                                <p>Ainda não existe um quiz para este deck.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {document.has_quiz ? (
                             <Button variant="secondary" className="w-full" onClick={() => router.push(`/quiz/${document.id}`)}>
                                Iniciar Quiz
                            </Button>
                        ) : (
                            <Button 
                                variant="secondary" 
                                className="w-full" 
                                onClick={handleCreateQuiz}
                                disabled={isCreatingQuiz}
                            >
                                {isCreatingQuiz ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        A gerar quiz...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Gerar Quiz com IA
                                    </>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}