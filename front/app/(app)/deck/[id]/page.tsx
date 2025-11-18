"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document, DeckStats } from "@/lib/api";
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
    Brain,
    Lock
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { formatDocumentTitle } from "@/lib/utils";
import { StatsChart } from "@/components/deck/StatsChart"; 
import { cn } from "@/lib/utils";
import { useLoading } from "@/components/providers/loading-provider";
import { useGenerationLimit } from "@/contexts/generation-limit-context"; 

const ActionCard = ({
    icon: Icon,
    iconBgColor,
    title,
    description,
    children,
    delay = 0,
    isLocked = false
}: {
    icon: any;
    iconBgColor: string;
    title: string;
    description: string;
    children: React.ReactNode;
    delay?: number;
    isLocked?: boolean;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        <Card className={cn(
            "group relative overflow-hidden border-border/50 transition-all duration-300 h-full flex flex-col",
            !isLocked && "hover:border-primary/50 hover:shadow-xl",
            isLocked && "bg-muted/30"
        )}>
            <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-500",
                !isLocked && "group-hover:opacity-100",
                iconBgColor === "flashcards" && "bg-[#FACC15]/5",
                iconBgColor === "quiz" && "bg-[#48cfea]/5"
            )} />
            
            <CardHeader className={cn("relative pb-4", isLocked && "opacity-50")}>
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "relative p-3 rounded-2xl shadow-lg transition-all duration-300",
                        !isLocked && "group-hover:scale-110 group-hover:-rotate-3",
                        iconBgColor === "flashcards" && "bg-[#FACC15] text-black",
                        iconBgColor === "quiz" && "bg-[#48cfea] text-black"
                    )}>
                        <Icon className="w-7 h-7" />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <CardTitle className={cn(
                            "text-xl font-bold mb-1 transition-colors duration-300",
                            !isLocked && iconBgColor === "flashcards" && "group-hover:text-[#FACC15]",
                            !isLocked && iconBgColor === "quiz" && "group-hover:text-[#48cfea]"
                        )}>
                            {title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="relative space-y-4 flex-grow flex flex-col justify-end">{children}</CardContent>
        </Card>
    </motion.div>
);

export default function DeckDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = Number(params.id);
    const { showLoading } = useLoading();
    const { refreshLimitInfo } = useGenerationLimit();

    const [document, setDocument] = useState<Document | null>(null);
    const [stats, setStats] = useState<DeckStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [isCreatingFlashcards, setIsCreatingFlashcards] = useState(false);

    const [creationProgress, setCreationProgress] = useState(0);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);


    const fetchDeckData = async () => {
        if (!documentId) return;
        if (!document && !stats) {
            setIsLoading(true);
        }
        try {
            const [docData, statsData] = await Promise.all([
                apiClient.getDocument(documentId),
                apiClient.getDocumentStats(documentId)
            ]);
            setDocument(docData);
            setStats(statsData);
        } catch (err) {
            setError("Não foi possível encontrar este deck. Verifique se o link está correto.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(documentId) fetchDeckData();
    }, [documentId]);
    
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const startProgressSimulation = () => {
        setCreationProgress(0);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        progressIntervalRef.current = setInterval(() => {
            setCreationProgress(prev => {
                if (prev >= 90) {
                    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                    return 90;
                }
                return prev + Math.floor(Math.random() * 10) + 1;
            });
        }, 800);
    };

    const stopProgressSimulation = (isError = false) => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (isError) {
            setCreationProgress(0);
        } else {
            setCreationProgress(100);
        }
    };

    const handleCreateFlashcards = async () => {
        if (!document) return;
        setIsCreatingFlashcards(true);
        startProgressSimulation();

        try {
            await apiClient.generateFlashcardsForDocument(document.id);
            await fetchDeckData();
            
            stopProgressSimulation();
            toast.success("Flashcards gerados com sucesso!");

            await refreshLimitInfo();

            setTimeout(() => {
            setIsCreatingFlashcards(false);
            setCreationProgress(0);
            }, 1000);

        } catch (error: any) {
            stopProgressSimulation(true);
        
            if (error.message === "LIMIT_EXCEEDED" && error.limitInfo) {
            toast.error("Limite diário atingido", {
                description: `Você já usou todas as ${error.limitInfo.limit} gerações hoje. Renova em ${error.limitInfo.hours_until_reset}h.`,
                duration: 5000
            });
            } else {
            toast.error("Falha ao gerar os flashcards", { 
                description: error.message || "Tente novamente mais tarde." 
            });
            }
            
            setIsCreatingFlashcards(false);
        }
    }

    const handleCreateQuiz = async () => {
        if (!document) return;
        setIsCreatingQuiz(true);
        startProgressSimulation();

        try {
            await apiClient.generateQuizForDocument(document.id);
            await fetchDeckData();

            stopProgressSimulation();
            toast.success("Quiz gerado com sucesso!");

            await refreshLimitInfo();

            setTimeout(() => {
            setIsCreatingQuiz(false);
            setCreationProgress(0);
            }, 1000);

        } catch (error: any) {
            stopProgressSimulation(true);
            
            if (error.message === "LIMIT_EXCEEDED" && error.limitInfo) {
            toast.error("Limite diário atingido", {
                description: `Você já usou todas as ${error.limitInfo.limit} gerações hoje. Renova em ${error.limitInfo.hours_until_reset}h.`,
                duration: 5000
            });
            } else {
            toast.error("Falha ao gerar o quiz", { 
                description: error.message || "Tente novamente mais tarde." 
            });
            }
            
            setIsCreatingQuiz(false);
        }
    }

    const handleStartQuiz = () => {
        showLoading("Carregando seu quiz...", false);
        router.push(`/quiz/${document.id}`);
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </motion.div>
                <p className="mt-4 text-muted-foreground animate-pulse">Carregando seu deck...</p>
            </div>
        );
    }

    if (error || !document) {
        return (
             <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
                    <div className="relative mb-6">
                        <AlertTriangle className="w-16 h-16 text-destructive" />
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h1 className="text-3xl font-bold mb-2">Ocorreu um Erro</h1>
                    <p className="text-muted-foreground max-w-md mb-6">{error || "Deck não encontrado."}</p>
                    <Button asChild size="lg" className="shadow-lg"><Link href="/library"><ArrowLeft className="w-4 h-4 mr-2" />Voltar para Biblioteca</Link></Button>
                </motion.div>
            </div>
        );
    }

    const hasFlashcards = stats && stats.flashcards.total > 0;
    const hasQuiz = document.has_quiz;

    const chartData = [
        { name: 'Flashcards', value: Math.round(stats?.flashcards.progress_percentage || 0), fill: 'hsl(var(--primary))' },
        { name: 'Quiz (Média)', value: Math.round(stats?.quiz?.average_score || 0), fill: 'hsl(var(--secondary))' },
    ];

    return (
        <div className="w-full min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 hover:bg-primary/10">
                        <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                    </Button>
                    <div className="relative">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
                            {formatDocumentTitle(document.file_path)}
                        </h1>
                        <p className="text-base sm:text-lg text-muted-foreground">Escolha sua atividade de estudo para este deck</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <ActionCard
                            icon={FileText}
                            iconBgColor="flashcards"
                            title="Flashcards"
                            description="Veja e revise flashcards, otimizando seu aprendizado."
                            delay={0.1}
                            isLocked={!hasFlashcards && !isCreatingFlashcards}
                        >
                            {isCreatingFlashcards ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>Gerando Flashcards... ({creationProgress}%)</span>
                                    </div>
                                    <Progress value={creationProgress} className="h-2 [&>div]:bg-[#FACC15]" />
                                </div>
                            ) : hasFlashcards ? (
                                <Button 
                                    className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#FACC15] hover:bg-[#FACC15]/90 text-black group" 
                                    size="lg" 
                                    asChild
                                >
                                    <Link href={`/study/${document.id}`}>
                                        <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                        Iniciar
                                    </Link>
                                </Button>
                            ) : (
                                <div className="space-y-4 text-center pt-4">
                                    <div className="flex justify-center">
                                        <div className="p-3 bg-muted rounded-full">
                                            <Lock className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Flashcards ainda não foram gerados.
                                    </p>
                                    <Button 
                                        className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#FACC15] hover:bg-[#FACC15]/90 text-black" 
                                        size="lg" 
                                        onClick={handleCreateFlashcards}
                                    >
                                        <Wand2 className="w-5 h-5 mr-2" />
                                        Criar Flashcards
                                    </Button>
                                </div>
                            )}
                        </ActionCard>

                        <ActionCard
                            icon={Brain}
                            iconBgColor="quiz"
                            title="Quiz"
                            description="Teste os seus conhecimentos com perguntas de múltipla escolha geradas pela IA."
                            delay={0.2}
                            isLocked={!hasQuiz && !isCreatingQuiz}
                        >
                            {isCreatingQuiz ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>Gerando Quiz... ({creationProgress}%)</span>
                                    </div>
                                    <Progress value={creationProgress} className="h-2 [&>div]:bg-[#48cfea]" />
                                </div>
                            ) : hasQuiz ? (
                                <Button 
                                    className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#48cfea] hover:bg-[#48cfea]/90 text-black group" 
                                    size="lg" 
                                    onClick={handleStartQuiz}
                                >
                                    <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                    Iniciar
                                </Button>
                            ) : (
                                <div className="space-y-4 text-center pt-4">
                                    <div className="flex justify-center">
                                        <div className="p-3 bg-muted rounded-full">
                                            <Lock className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Quiz ainda não foi gerado.
                                    </p>
                                    <Button 
                                        className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#48cfea] hover:bg-[#48cfea]/90 text-black" 
                                        size="lg" 
                                        onClick={handleCreateQuiz}
                                    >
                                        <Wand2 className="w-5 h-5 mr-2" />
                                        Criar Quiz
                                    </Button>
                                </div>
                            )}
                        </ActionCard>
                    </div>

                    <div className="lg:col-span-2">
                        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <Card className="border-border/50 sticky top-6 overflow-hidden h-full">
                                <CardHeader className="relative pb-4">
                                    <CardTitle className="text-xl">Estatísticas</CardTitle>
                                    <CardDescription>Visão Geral</CardDescription>
                                </CardHeader>
                                <CardContent className="relative space-y-4">
                                    <div className="h-48 w-full rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                                        {stats ? <StatsChart data={chartData} /> : <div className="h-full w-full bg-muted rounded-lg animate-pulse" />}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Flashcards</h4>
                                        {hasFlashcards ? (
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between"><span>Conhecidos</span><span>{stats?.flashcards.known ?? '--'}</span></div>
                                                <div className="flex justify-between"><span>Ainda aprendendo</span><span>{stats?.flashcards.learning ?? '--'}</span></div>
                                                <Progress value={stats?.flashcards.progress_percentage || 0} className="h-2 mt-2" />
                                                <p className="text-xs text-muted-foreground text-right">{Math.round(stats?.flashcards.progress_percentage || 0)}% de acerto</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-2">Crie flashcards para ver estatísticas.</p>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h4 className="font-semibold">Quiz</h4>
                                        {hasQuiz && stats?.quiz && stats.quiz.total_attempts > 0 ? (
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between"><span>Última pontuação</span><span>{stats.quiz.last_score ?? '--'}%</span></div>
                                                <div className="flex justify-between"><span>Média</span><span>{stats.quiz.average_score ?? '--'}%</span></div>
                                                <Progress value={stats.quiz.average_score || 0} className="h-2 mt-2 [&>div]:bg-secondary" />
                                                <p className="text-xs text-muted-foreground text-right">{stats.quiz.total_attempts} tentativa(s)</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-2">
                                                {hasQuiz ? "Responda o quiz para ver suas estatísticas." : "Crie o quiz para ver suas estatísticas."}
                                            </p>
                                        )}
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