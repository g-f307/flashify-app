"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document, DeckStats, GuidedStudyProgress } from "@/lib/api";
import {
    Card,
    CardAction,
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
    Lock,
    PlayCircle,
    ChevronDown,
    ChevronUp,
    Sparkles,
    RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { formatDocumentTitle } from "@/lib/utils";
import { StatsChart } from "@/components/deck/StatsChart";
import { SrsOverviewPanel } from "@/components/deck/srs-overview-panel";
import { BulkEditContentDialog } from "@/components/deck/bulk-edit-content-dialog";
import { cn } from "@/lib/utils";
import { useLoading } from "@/components/providers/loading-provider";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import { ResumeStudyDialog } from "@/components/study/resume-study-dialog";
import { SrsHelpLink } from "@/components/support/srs-help-link";
import { ShareDeckModal } from "@/components/deck/share-deck-modal";

const ActionCard = ({
    icon: Icon,
    iconBgColor,
    title,
    description,
    children,
    delay = 0,
    isLocked = false,
    action,
    onActivate,
    className,
    headerClassName,
    contentClassName,
}: {
    icon: any;
    iconBgColor: string;
    title: string;
    description: string;
    children: React.ReactNode;
    delay?: number;
    isLocked?: boolean;
    action?: React.ReactNode;
    onActivate?: () => void;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
}) => (
    <motion.div
        className="self-start"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        <Card className={cn(
            "group relative flex flex-col overflow-hidden border-border/50 transition-all duration-300",
            !isLocked && "hover:shadow-xl",
            !isLocked && iconBgColor === "flashcards" && "hover:border-[#FACC15]/50",
            !isLocked && iconBgColor === "quiz" && "hover:border-[#48cfea]/50",
            !isLocked && iconBgColor === "guided" && "hover:border-[#7FD9A0]/45",
            isLocked && "bg-muted/30",
            onActivate && "cursor-pointer",
            className
        )}
            onClick={(event) => {
                if (!onActivate) return;
                const target = event.target as HTMLElement;
                if (target.closest("button, a, input, textarea, select, [role='button'], [data-card-ignore-click='true']")) {
                    return;
                }
                onActivate();
            }}>
            <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-500",
                !isLocked && "group-hover:opacity-100",
                iconBgColor === "flashcards" && "bg-[#FACC15]/5",
                iconBgColor === "quiz" && "bg-[#48cfea]/5",
                iconBgColor === "guided" && "bg-gradient-to-br from-[#7FD9A0]/10 via-[#7FD9A0]/5 to-transparent dark:from-[#7FD9A0]/12 dark:via-[#7FD9A0]/6"
            )} />

            <CardHeader className={cn("relative pb-4", isLocked && "opacity-50", headerClassName)}>
                {action ? <CardAction>{action}</CardAction> : null}
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "relative p-3 rounded-2xl shadow-lg transition-all duration-300",
                        !isLocked && "group-hover:scale-110 group-hover:-rotate-3",
                        iconBgColor === "flashcards" && "bg-[#FACC15] text-black",
                        iconBgColor === "quiz" && "bg-[#48cfea] text-black",
                        iconBgColor === "guided" && "bg-[#7FD9A0] text-black"
                    )}>
                        {iconBgColor === "guided" ? (
                            <div className="relative w-7 h-7">
                                <FileText className="absolute left-0 bottom-0 w-4.5 h-4.5" />
                                <Wand2 className="absolute right-0 top-0 w-4 h-4 opacity-90" />
                            </div>
                        ) : (
                            <Icon className="w-7 h-7" />
                        )}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <CardTitle className={cn(
                            "text-xl font-bold mb-1 transition-colors duration-300",
                            !isLocked && iconBgColor === "flashcards" && "group-hover:text-[#FACC15]",
                            !isLocked && iconBgColor === "quiz" && "group-hover:text-[#48cfea]",
                            !isLocked && iconBgColor === "guided" && "group-hover:text-[#3E8E63] dark:group-hover:text-[#9EE6B8]"
                        )}>
                            {title}
                        </CardTitle>
                        <CardDescription className="h-[4.5rem] overflow-hidden text-sm leading-relaxed line-clamp-3">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className={cn("relative flex flex-grow flex-col justify-end space-y-4", contentClassName)}>{children}</CardContent>
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
    const [srsStats, setSrsStats] = useState<any>(null);
    const [srsGroups, setSrsGroups] = useState<any>(null);
    const [quizSrsGroups, setQuizSrsGroups] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [isCreatingFlashcards, setIsCreatingFlashcards] = useState(false);
    const [showFlashcardSrs, setShowFlashcardSrs] = useState(false);
    const [showQuizSrs, setShowQuizSrs] = useState(false);
    const [guidedProgress, setGuidedProgress] = useState<GuidedStudyProgress | null>(null);
    const [isRestructuring, setIsRestructuring] = useState(false);
    const [showGuidedResumeDialog, setShowGuidedResumeDialog] = useState(false);

    const [creationProgress, setCreationProgress] = useState(0);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);


    const fetchDeckData = async () => {
        if (!documentId) return;
        if (!document && !stats) {
            setIsLoading(true);
        }
        try {
            const [docData, statsData, srsStatsData, srsGroupsData, quizGroupsData, progressData] = await Promise.all([
                apiClient.getDocument(documentId),
                apiClient.getDocumentStats(documentId),
                apiClient.getSrsStats(documentId),
                apiClient.getSrsGroups(documentId),
                apiClient.getQuizSrsGroups(documentId),
                apiClient.getGuidedStudyProgress(documentId),
            ]);
            docData.srs_enabled = srsStatsData.srs_enabled;
            docData.flashcards_pending = srsStatsData.flashcards_pending;
            docData.questions_pending = srsStatsData.questions_pending;
            setDocument(docData);
            setStats(statsData);
            setSrsStats(srsStatsData);
            setSrsGroups(srsGroupsData);
            setQuizSrsGroups(quizGroupsData);
            setGuidedProgress(progressData);
        } catch (err) {
            setError("Não foi possível encontrar este deck. Verifique se o link está correto.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (documentId) fetchDeckData();
    }, [documentId]);

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    const handleToggleSrs = async () => {
        if (!document) return;
        const newState = !document.srs_enabled;
        try {
            await apiClient.toggleSrs(document.id, newState);
            setDocument(prev => prev ? { ...prev, srs_enabled: newState } : null);
            await fetchDeckData();
            toast.success(newState ? "Revisões diárias ativadas" : "Revisões pausadas");
        } catch (e) {
            toast.error("Erro ao alterar configurações.");
        }
    };

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

    const openGuidedStudy = (restart = false) => {
        showLoading("Montando seu estudo guiado...", false);
        router.push(restart ? `/guided/${document.id}?restart=1` : `/guided/${document.id}`);
    };

    const handleStartGuidedStudy = async () => {
        if (!document) return;
        if (guidedProgress && !guidedProgress.is_completed && guidedProgress.completed_step_ids.length > 0) {
            setShowGuidedResumeDialog(true);
            return;
        }
        if (guidedProgress?.is_completed) {
            try {
                await apiClient.saveGuidedStudyProgress(document.id, [], false);
                setGuidedProgress(null);
                openGuidedStudy(true);
            } catch {
                toast.error("Não foi possível reiniciar a trilha agora.");
            }
            return;
        }
        openGuidedStudy(false);
    };

    const handleRestartGuidedStudy = async () => {
        if (!document) return;
        try {
            await apiClient.saveGuidedStudyProgress(document.id, [], false);
            setGuidedProgress(null);
            setShowGuidedResumeDialog(false);
            openGuidedStudy(true);
        } catch {
            toast.error("Não foi possível reiniciar a trilha agora.");
        }
    };

    const handleRestructureGuided = async () => {
        if (!document) return;
        setIsRestructuring(true);
        try {
            await apiClient.resetGuidedStudy(document.id);
            setGuidedProgress(null);
            toast.success("Trilha reestruturada com IA.");
            await refreshLimitInfo();
        } catch (error: any) {
            if (error.message === "LIMIT_EXCEEDED" && error.limitInfo) {
                toast.error("Limite diário atingido", {
                    description: `Você já usou todas as ${error.limitInfo.limit} gerações hoje. Renova em ${error.limitInfo.hours_until_reset}h.`,
                    duration: 5000
                });
            } else {
                toast.error("Não foi possível reestruturar a trilha.");
            }
        } finally {
            setIsRestructuring(false);
        }
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
    const showSrsOverview = srsStats?.srs_enabled ?? false;
    const chartData = [
        { name: 'Flashcards', value: Math.round(stats?.flashcards.progress_percentage || 0), fill: '#FACC15' },
        { name: 'Quiz', value: Math.round(stats?.quiz?.average_score || 0), fill: '#48cfea' },
    ];

    return (
        <div className="w-full min-h-screen bg-background">
            {guidedProgress && (
                <ResumeStudyDialog
                    open={showGuidedResumeDialog}
                    onOpenChange={setShowGuidedResumeDialog}
                    title="Continuar estudo guiado?"
                    progressLabel={`Você parou no passo ${guidedProgress.completed_step_ids.length} de ${guidedProgress.total_steps}`}
                    onContinue={() => openGuidedStudy(false)}
                    onRestart={handleRestartGuidedStudy}
                />
            )}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 lg:max-w-[calc(60%-1rem)] xl:max-w-[calc(60%-1.5rem)]"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-primary/10">
                            <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                        </Button>
                    </div>
                    <div className="relative max-w-full">
                        <div className="mb-2 flex flex-wrap items-start gap-3">
                            <h1
                                className="max-w-full flex-1 text-2xl font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl"
                                title={formatDocumentTitle(document.file_path, document.title)}
                            >
                                {formatDocumentTitle(document.file_path, document.title)}
                            </h1>
                            {document.status === "COMPLETED" && (
                                <div className="shrink-0 pt-1 sm:pt-1.5">
                                    <ShareDeckModal
                                        documentId={document.id}
                                        documentTitle={formatDocumentTitle(document.file_path, document.title)}
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-base sm:text-lg text-muted-foreground">Escolha sua atividade de estudo para este deck</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <ActionCard
                                icon={FileText}
                                iconBgColor="flashcards"
                                title="Flashcards"
                                description="Veja e revise flashcards, otimizando seu aprendizado."
                                delay={0.1}
                                isLocked={!hasFlashcards && !isCreatingFlashcards}
                                className="xl:min-h-[288px]"
                                onActivate={hasFlashcards && !isCreatingFlashcards ? () => router.push(`/study/${document.id}`) : undefined}
                                action={hasFlashcards ? (
                                    <BulkEditContentDialog
                                        documentId={document.id}
                                        mode="flashcards"
                                        onSaved={fetchDeckData}
                                        triggerMode="icon"
                                    />
                                ) : undefined}
                            >
                                {isCreatingFlashcards ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#48cfea]" />
                                            <span>Gerando Flashcards... ({creationProgress}%)</span>
                                        </div>
                                        <Progress value={creationProgress} className="h-2 bg-[#FACC15]/20" indicatorClassName="bg-[#FACC15]" />
                                    </div>
                                ) : hasFlashcards ? (
                                    <div className="space-y-4">
                                        <Button
                                            className="w-full h-12 text-base shadow-md transition-all group"
                                            size="lg"
                                            asChild
                                        >
                                            <Link href={`/study/${document.id}`}>
                                                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                                Iniciar
                                            </Link>
                                        </Button>
                                        {document.srs_enabled && srsGroups && (
                                            <div className="space-y-2" data-card-ignore-click="true">
                                                <div
                                                    className="flex items-center justify-between mb-1 cursor-pointer hover:bg-[#FACC15]/10 p-1.5 -mx-1.5 rounded-lg transition-colors group/toggle"
                                                    onClick={() => setShowFlashcardSrs(!showFlashcardSrs)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="w-4 h-4 text-[#FACC15] group-hover/toggle:scale-110 transition-transform" />
                                                        <h4 className="text-sm font-semibold">Revisão Inteligente</h4>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        {showFlashcardSrs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                    </Button>
                                                </div>

                                                <AnimatePresence initial={false}>
                                                    {showFlashcardSrs && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden space-y-2"
                                                        >
                                                            <p className="text-[10px] text-muted-foreground mb-2">O sistema organiza seus cards de acordo com seu desempenho.</p>

                                                            {srsGroups.new_cards > 0 && (
                                                                <Link href={`/study/${document.id}?group=new`} className="flex items-center gap-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Novos</span>
                                                                        <p className="text-[10px] text-muted-foreground">Nunca estudados</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-blue-500">{srsGroups.new_cards}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-blue-500 transition-colors" />
                                                                </Link>
                                                            )}

                                                            {srsGroups.needs_review > 0 && (
                                                                <Link href={`/study/${document.id}?group=needs_review`} className="flex items-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Errou</span>
                                                                        <p className="text-[10px] text-muted-foreground">Revisar novamente</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-red-500">{srsGroups.needs_review}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-red-500 transition-colors" />
                                                                </Link>
                                                            )}

                                                            {srsGroups.learning > 0 && (
                                                                <Link href={`/study/${document.id}?group=learning`} className="flex items-center gap-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Quase acertou</span>
                                                                        <p className="text-[10px] text-muted-foreground">Na memória recente</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-amber-500">{srsGroups.learning}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-amber-500 transition-colors" />
                                                                </Link>
                                                            )}

                                                            {srsGroups.almost_mastered > 0 && (
                                                                <Link href={`/study/${document.id}?group=almost_mastered`} className="flex items-center gap-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Acertou</span>
                                                                        <p className="text-[10px] text-muted-foreground">Retenção de longo prazo</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-emerald-500">{srsGroups.almost_mastered}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-emerald-500 transition-colors" />
                                                                </Link>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Button
                                            className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#FACC15] hover:bg-[#FACC15]/90 text-black"
                                            size="lg"
                                            onClick={handleCreateFlashcards}
                                        >
                                            <Wand2 className="w-5 h-5 mr-2" />
                                            Criar Flashcards
                                        </Button>
                                        <div className="flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-border/40 bg-muted/30 px-3 py-2 text-sm text-muted-foreground/90 dark:border-white/10 dark:bg-white/[0.03]">
                                            <Lock className="h-4 w-4 shrink-0" />
                                            <span className="font-medium">Flashcards não gerados.</span>
                                        </div>
                                    </div>
                                )}
                            </ActionCard>

                            <ActionCard
                                icon={Brain}
                                iconBgColor="quiz"
                                title="Quiz"
                                description="Responda perguntas de quiz geradas pela IA."
                                delay={0.2}
                                isLocked={!hasQuiz && !isCreatingQuiz}
                                className="xl:min-h-[288px]"
                                onActivate={hasQuiz && !isCreatingQuiz ? handleStartQuiz : undefined}
                                action={hasQuiz ? (
                                    <BulkEditContentDialog
                                        documentId={document.id}
                                        mode="quiz"
                                        onSaved={fetchDeckData}
                                        triggerMode="icon"
                                    />
                                ) : undefined}
                            >
                                {isCreatingQuiz ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#48cfea]" />
                                            <span>Gerando Quiz... ({creationProgress}%)</span>
                                        </div>
                                        <Progress value={creationProgress} className="h-2 bg-[#48cfea]/20" indicatorClassName="bg-[#48cfea]" />
                                    </div>
                                ) : hasQuiz ? (
                                    <div className="space-y-4">
                                        <Button
                                            className="w-full h-12 text-base shadow-md transition-all group bg-[#48cfea] hover:bg-[#48cfea]/90 text-black"
                                            size="lg"
                                            onClick={handleStartQuiz}
                                        >
                                            <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                            Iniciar
                                        </Button>
                                        {document.srs_enabled && quizSrsGroups && (
                                            <div className="space-y-2" data-card-ignore-click="true">
                                                <div
                                                    className="flex items-center justify-between mb-1 cursor-pointer hover:bg-[#48cfea]/10 p-1.5 -mx-1.5 rounded-lg transition-colors group/toggle"
                                                    onClick={() => setShowQuizSrs(!showQuizSrs)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="w-4 h-4 text-[#48cfea] group-hover/toggle:scale-110 transition-transform" />
                                                        <h4 className="text-sm font-semibold">Revisão Inteligente</h4>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        {showQuizSrs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                    </Button>
                                                </div>

                                                <AnimatePresence initial={false}>
                                                    {showQuizSrs && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden space-y-2"
                                                        >
                                                            <p className="text-[10px] text-muted-foreground mb-2">O sistema acompanha seu desempenho em cada questão.</p>

                                                            {quizSrsGroups.new_questions > 0 && (
                                                                <Link href={`/quiz/${document.id}?group=new`} className="flex items-center gap-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Novas</span>
                                                                        <p className="text-[10px] text-muted-foreground">Nunca respondidas</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-blue-500">{quizSrsGroups.new_questions}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-blue-500 transition-colors" />
                                                                </Link>
                                                            )}

                                                            {quizSrsGroups.wrong > 0 && (
                                                                <Link href={`/quiz/${document.id}?group=wrong`} className="flex items-center gap-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Errou</span>
                                                                        <p className="text-[10px] text-muted-foreground">Questões que precisa revisar</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-red-500">{quizSrsGroups.wrong}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-red-500 transition-colors" />
                                                                </Link>
                                                            )}

                                                            {quizSrsGroups.correct > 0 && (
                                                                <Link href={`/quiz/${document.id}?group=correct`} className="flex items-center gap-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 transition-all group/item cursor-pointer">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-sm font-medium">Acertou</span>
                                                                        <p className="text-[10px] text-muted-foreground">Questões dominadas</p>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-emerald-500">{quizSrsGroups.correct}</span>
                                                                    <Play className="w-4 h-4 text-muted-foreground group-hover/item:text-emerald-500 transition-colors" />
                                                                </Link>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Button
                                            className="w-full h-12 text-base shadow-lg hover:shadow-xl transition-all bg-[#48cfea] hover:bg-[#48cfea]/90 text-black"
                                            size="lg"
                                            onClick={handleCreateQuiz}
                                        >
                                            <Wand2 className="w-5 h-5 mr-2" />
                                            Criar Quiz
                                        </Button>
                                        <div className="flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-border/40 bg-muted/30 px-3 py-2 text-sm text-muted-foreground/90 dark:border-white/10 dark:bg-white/[0.03]">
                                            <Lock className="h-4 w-4 shrink-0" />
                                            <span className="font-medium">Quiz ainda não foi gerado.</span>
                                        </div>
                                    </div>
                                )}
                            </ActionCard>
                        </div>

                        <ActionCard
                            icon={Sparkles}
                            iconBgColor="guided"
                            title="Estudo guiado"
                            description="Siga uma trilha mista com explicações rápidas e perguntas de validação por blocos do assunto."
                            delay={0.3}
                            isLocked={!hasFlashcards || !hasQuiz}
                            className="min-h-0"
                            headerClassName="pb-1"
                            contentClassName="space-y-2"
                        >
                            {hasFlashcards && hasQuiz ? (
                                <div className="space-y-2.5">
                                    <Button
                                        className="w-full h-11 text-base shadow-md transition-all group bg-[#7FD9A0] hover:bg-[#6fca91] text-black"
                                        size="lg"
                                        onClick={handleStartGuidedStudy}
                                    >
                                        <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                        {guidedProgress?.is_completed ? "Refazer" : "Iniciar"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-full text-xs text-muted-foreground hover:text-foreground"
                                        onClick={handleRestructureGuided}
                                        disabled={isRestructuring}
                                    >
                                        {isRestructuring
                                            ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                            : <RotateCcw className="mr-1.5 h-3 w-3" />}
                                        Reestruturar trilha com IA
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2.5 text-center pt-2.5">
                                    <div className="flex justify-center">
                                        <div className="rounded-full bg-muted p-2.5">
                                            <Lock className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Gere flashcards e quiz para liberar o estudo guiado.
                                    </p>
                                </div>
                            )}
                        </ActionCard>
                    </div>

                    <div className={cn("lg:col-span-2 space-y-6 lg:-mt-[5.5rem]", showSrsOverview && "lg:-mt-[8.5rem] lg:space-y-2")}>
                        {showSrsOverview && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 }}>
                                <SrsOverviewPanel
                                    documentId={document.id}
                                    hasQuiz={hasQuiz}
                                    srsStats={srsStats}
                                />
                            </motion.div>
                        )}

                        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                            <Card className="border-border/50 sticky top-0 h-full min-h-[calc(100%+2rem)] gap-2 overflow-hidden">
                                <CardHeader className="relative pb-0">
                                    <CardTitle className="text-xl">Estatísticas</CardTitle>
                                </CardHeader>
                                <CardContent className="relative space-y-2.5 pt-0">
                                    <div className="overflow-hidden rounded-2xl border border-black/10 bg-muted/15 px-3 pt-0.5 pb-0 dark:border-white/10">
                                        <div className="mb-0.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#FACC15]" />
                                                <span className="text-[11px] text-muted-foreground">Flashcards</span>
                                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#48cfea] ml-2" />
                                                <span className="text-[11px] text-muted-foreground">Quiz</span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">0-100%</span>
                                        </div>
                                        <div className="h-52 w-full">
                                            {stats ? <StatsChart data={chartData} /> : <div className="h-full w-full animate-pulse rounded-xl bg-muted" />}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="min-w-0 rounded-2xl border border-[#FACC15]/60 bg-[#FACC15]/8 p-3 dark:border-[#FACC15]/55">
                                            <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Flashcards</p>
                                            <p className="mt-2 text-2xl font-bold leading-none">
                                                {hasFlashcards ? Math.round(stats?.flashcards.progress_percentage || 0) : 0}
                                                <span className="ml-1 text-sm text-muted-foreground">%</span>
                                            </p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">
                                                {stats?.flashcards.known ?? 0} de {stats?.flashcards.total ?? 0}
                                            </p>
                                        </div>

                                        <div className="min-w-0 rounded-2xl border border-[#48cfea]/60 bg-[#48cfea]/8 p-3 dark:border-[#48cfea]/55">
                                            <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Quiz</p>
                                            <p className="mt-2 text-2xl font-bold leading-none">
                                                {hasQuiz && stats?.quiz?.average_score ? Math.round(stats.quiz.average_score) : 0}
                                                <span className="ml-1 text-sm text-muted-foreground">%</span>
                                            </p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">
                                                {stats?.quiz?.total_attempts ?? 0} tentativa(s)
                                            </p>
                                        </div>

                                        <div className="min-w-0 rounded-2xl border border-[#7FD9A0]/60 bg-[#7FD9A0]/8 p-3 dark:border-[#7FD9A0]/55">
                                            <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Guiado</p>
                                            <p className="mt-2 text-2xl font-bold leading-none">
                                                {hasFlashcards && hasQuiz && guidedProgress && guidedProgress.total_steps > 0
                                                    ? Math.round((guidedProgress.completed_step_ids.length / guidedProgress.total_steps) * 100)
                                                    : 0}
                                                <span className="ml-1 text-sm text-muted-foreground">%</span>
                                            </p>
                                            <p className="mt-2 text-[11px] text-muted-foreground">
                                                {hasFlashcards && hasQuiz && guidedProgress
                                                    ? `${guidedProgress.completed_step_ids.length}/${guidedProgress.total_steps}`
                                                    : "sem trilha"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-muted/15 px-3 py-2.5 dark:border-white/10">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium">SRS</span>
                                                <SrsHelpLink />
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">Revisão diária automática</p>
                                        </div>
                                        <Switch
                                            checked={document.srs_enabled}
                                            onCheckedChange={handleToggleSrs}
                                        />
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
