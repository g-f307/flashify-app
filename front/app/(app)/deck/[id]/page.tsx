"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document } from "@/lib/api";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    FileText, 
    Loader2, 
    AlertTriangle, 
    Wand2,
    Play,
    Brain
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { formatDocumentTitle } from "@/lib/utils";

// Componente de card de ação melhorado
const ActionCard = ({
    icon: Icon,
    iconColor,
    title,
    description,
    children,
    delay = 0
}: {
    icon: any;
    iconColor: string;
    title: string;
    description: string;
    children: React.ReactNode;
    delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        <Card className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl h-full flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardHeader className="relative pb-4">
                <div className="flex items-start gap-4">
                    <div className={`relative p-3 rounded-2xl ${iconColor} shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
                        <Icon className="w-7 h-7" />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <CardTitle className="text-xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">
                            {title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                            {description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative space-y-4 flex-grow flex flex-col justify-end">
                {children}
            </CardContent>
        </Card>
    </motion.div>
);

export default function DeckDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = Number(params.id);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

    const fetchDocumentDetails = async () => {
        if (!documentId) return;
        !document && setIsLoading(true); // Only show full loading on first load
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
        if (!document) return;
        setIsCreatingQuiz(true);
        toast.info("A IA está a gerar o seu quiz...", {
            description: "Isto pode levar um momento. A página será atualizada quando estiver pronto.",
        });

        try {
            await apiClient.generateQuizForDocument(document.id);
            await fetchDocumentDetails();
            toast.success("Quiz gerado com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao gerar o quiz", { description: error.message || "Tente novamente mais tarde." });
        } finally {
            setIsCreatingQuiz(false);
        }
    }
    
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </motion.div>
                <p className="mt-4 text-muted-foreground animate-pulse">A carregar o seu deck...</p>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
                    <div className="relative mb-6">
                        <AlertTriangle className="w-16 h-16 text-destructive" />
                        <div className="absolute inset-0 blur-2xl bg-destructive/20" />
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h1 className="text-3xl font-bold mb-2">Ocorreu um Erro</h1>
                    <p className="text-muted-foreground max-w-md mb-6">{error || "Deck não encontrado."}</p>
                    <Button asChild size="lg" className="shadow-lg"><Link href="/library"><ArrowLeft className="w-4 h-4 mr-2" />Voltar para a Biblioteca</Link></Button>
                </motion.div>
            </div>
        );
    }

    const studyProgress = document.total_flashcards > 0 
        ? (document.studied_flashcards / document.total_flashcards) * 100 
        : 0;
    
    const knownFlashcards = document.studied_flashcards;
    const learningFlashcards = document.total_flashcards - document.studied_flashcards;
    
    return (
        <div className="w-full min-h-screen bg-gradient-to-b from-background to-background/95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                    <Button variant="ghost" size="sm" asChild className="mb-2 hover:bg-primary/10">
                        <Link href="/library"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link>
                    </Button>
                    <div className="relative">
                        <div className="absolute -top-4 left-0 w-20 h-20 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-4 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2 relative">
                            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">{formatDocumentTitle(document.file_path)}</span>
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground relative">Escolha a sua atividade de estudo para este deck</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <ActionCard
                            icon={FileText}
                            iconColor="bg-gradient-to-br from-primary to-yellow-400 text-primary-foreground"
                            title="Deck"
                            description="Aprenda através de repetição espaçada. Revise flashcards e marque os que você já domina."
                            delay={0.1}
                        >
                            {/* 🔽 CORREÇÃO AQUI: Removido o botão "Criar Mais Flashcards" 🔽 */}
                            <div className="mt-auto">
                                <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-yellow-400 hover:from-primary/90 hover:to-yellow-400/90 group" size="lg" asChild>
                                    <Link href={`/study/${document.id}`}><Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />Iniciar Estudos</Link>
                                </Button>
                            </div>
                        </ActionCard>

                        <ActionCard
                            icon={Brain}
                            iconColor="bg-gradient-to-br from-secondary to-cyan-400 text-secondary-foreground"
                            title="Quiz"
                            description="Aprenda através de repetição espaçada. Revise flashcards e marque os que você já domina."
                            delay={0.2}
                        >
                            <div className="mt-auto">
                                <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-secondary to-cyan-400 hover:from-secondary/90 hover:to-cyan-400/90 group" size="lg" onClick={document.has_quiz ? () => router.push(`/quiz/${document.id}`) : handleCreateQuiz} disabled={isCreatingQuiz}>
                                    {isCreatingQuiz ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : (document.has_quiz ? <Play className="w-5 h-5 mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />)}
                                    {isCreatingQuiz ? 'A Gerar...' : (document.has_quiz ? 'Iniciar Quiz' : 'Criar Quiz')}
                                </Button>
                            </div>
                        </ActionCard>
                    </div>

                    <div className="lg:col-span-2">
                        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <Card className="border-border/50 sticky top-6 overflow-hidden h-full">
                                <CardHeader className="relative pb-4">
                                    <CardTitle className="text-xl text-primary">Estatísticas</CardTitle>
                                    <CardDescription>Visão Geral</CardDescription>
                                </CardHeader>
                                <CardContent className="relative space-y-4">
                                    <div className="h-24 w-full bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                                        Gráfico de Barras (placeholder)
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Flashcards</h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between"><span>Conhecidos</span><span>{knownFlashcards}</span></div>
                                            <div className="flex justify-between"><span>Ainda aprendendo</span><span>{learningFlashcards}</span></div>
                                            <Progress value={studyProgress} className="h-2 mt-2" />
                                            <p className="text-xs text-muted-foreground text-right">{Math.round(studyProgress)}% de acerto</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Quiz</h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between"><span>Conhecidos</span><span>0</span></div>
                                            <div className="flex justify-between"><span>Ainda aprendendo</span><span>0</span></div>
                                            <Progress value={0} className="h-2 mt-2" />
                                            <p className="text-xs text-muted-foreground text-right">0% de acerto</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}