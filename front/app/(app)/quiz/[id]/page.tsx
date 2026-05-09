"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { apiClient, Document, Question, CheckAnswerResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    AlertTriangle, 
    ArrowLeft, 
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useLoading } from "@/components/providers/loading-provider"; 
import { QuizPerformanceReport } from "@/components/quiz/quiz-performance-report"; 
import { QuestionStage } from "@/components/quiz/question-stage";
import { EditQuestionModal } from "@/components/quiz/edit-question-modal";
import { ResumeStudyDialog } from "@/components/study/resume-study-dialog";
import { quizProgressManager, QuizProgress } from "@/lib/quiz-progress";

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';
type AnswerFeedback = CheckAnswerResponse;


export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = Number(params.id);
    const { showLoading, hideLoading } = useLoading();

    const searchParams = useSearchParams();
    const mode = searchParams?.get('mode');
    const group = searchParams?.get('group');

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
    const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
    const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [questionResults, setQuestionResults] = useState<Record<number, boolean>>({});
    const [quizStartedAt, setQuizStartedAt] = useState<string | null>(null);

    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [savedProgress, setSavedProgress] = useState<QuizProgress | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false);
    const [questionPendingDelete, setQuestionPendingDelete] = useState<Question | null>(null);
    const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);

    const canResumeQuiz = !group && mode !== 'review';

    useEffect(() => {
        if (!documentId) return;
        const fetchQuiz = async () => {
            try {
                showLoading("Carregando seu quiz...", true);
                setIsLoading(true);

                if (group) {
                     const groupQuiz = await apiClient.getQuizSrsGroupQuestions(documentId, group);
                     if (!groupQuiz || groupQuiz.questions.length === 0) {
                         toast.info("Você não possui questões nesta categoria!");
                         router.back();
                         return;
                     }
                     setDocument({
                         id: documentId,
                         file_path: groupQuiz.title,
                         status: 'COMPLETED',
                         user_id: 0,
                         created_at: new Date().toISOString(),
                         total_flashcards: 0,
                         studied_flashcards: 0,
                         generates_flashcards: false,
                         generates_quizzes: true,
                         has_quiz: true,
                         quiz: groupQuiz
                     } as Document);
                     setQuestions(groupQuiz.questions);
                     setQuizStartedAt(new Date().toISOString());
                } else if (mode === 'review') {
                     const reviewQuiz = await apiClient.getReviewQuiz(documentId);
                     if (!reviewQuiz || reviewQuiz.questions.length === 0) {
                         toast.info("Você não possui erros pendentes de revisão neste deck!");
                         router.back();
                         return;
                     }
                     setDocument({
                         id: documentId,
                         file_path: "Revisão de Erros",
                         status: 'COMPLETED',
                         user_id: 0,
                         created_at: new Date().toISOString(),
                         total_flashcards: 0,
                         studied_flashcards: 0,
                         generates_flashcards: false,
                         generates_quizzes: true,
                         has_quiz: true,
                         quiz: reviewQuiz
                     } as Document);
                     setQuestions(reviewQuiz.questions);
                     setQuizStartedAt(new Date().toISOString());
                } else {
                     const doc = await apiClient.getDocument(documentId);
                     if (!doc.quiz || doc.quiz.questions.length === 0) {
                         setError("Este deck não tem um quiz válido para iniciar.");
                     } else {
                        setDocument(doc);
                        setQuestions([...doc.quiz.questions]);
                        setQuizStartedAt(new Date().toISOString());

                        if (canResumeQuiz) {
                            const progress = quizProgressManager.get(documentId);
                            if (progress && progress.currentQuestionIndex > 0) {
                                setSavedProgress(progress);
                                setShowResumePrompt(true);
                            }
                        }
                    }
                }
            } catch (err) {
                setError("Não foi possível carregar o quiz.");
            } finally {
                hideLoading();
                setIsLoading(false);
            }
        };
        fetchQuiz();
        
    }, [documentId, canResumeQuiz, group, mode]); 

    useEffect(() => {
        if (!canResumeQuiz || questions.length === 0 || showResults) return;
        if (currentQuestionIndex <= 0) return;

        quizProgressManager.save(documentId, {
            currentQuestionIndex,
            totalQuestions: questions.length,
            correctAnswersCount,
            questionResults,
            startedAt: quizStartedAt || new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
        });
    }, [canResumeQuiz, correctAnswersCount, currentQuestionIndex, documentId, questionResults, questions.length, quizStartedAt, showResults]);

    const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);
    const progressPercentage = useMemo(() => {
        if (questions.length === 0) return 0;
        const currentStep = showResults ? questions.length : currentQuestionIndex + 1;
        return (currentStep / questions.length) * 100;
    }, [currentQuestionIndex, questions.length, showResults]);


    const handleCheckAnswer = async () => {
        if (!selectedAnswerId) {
            toast.warning("Por favor, selecione uma alternativa.");
            return;
        }
        setIsChecking(true);
        try {
            const result = await apiClient.checkQuizAnswer(currentQuestion.id, selectedAnswerId);
            if (result && typeof result.is_correct !== 'undefined') {
                setFeedback(result);
                setAnswerStatus(result.is_correct ? 'correct' : 'incorrect');
                if (result.is_correct) {
                    setCorrectAnswersCount(prev => prev + 1);
                }
                setQuestionResults(prev => ({
                    ...prev,
                    [currentQuestion.id]: result.is_correct
                }));
            } else {
                console.error("Resposta da API inválida ou vazia:", result);
                throw new Error("O servidor não retornou uma resposta válida.");
            }
        } catch (err: any) {
            toast.error("Erro ao verificar resposta.", { description: err.message });
        } finally {
            setIsChecking(false);
        }
    };

    const handleResumeQuiz = () => {
        if (!savedProgress) return;
        setCurrentQuestionIndex(savedProgress.currentQuestionIndex);
        setCorrectAnswersCount(savedProgress.correctAnswersCount);
        setQuestionResults(savedProgress.questionResults);
        setQuizStartedAt(savedProgress.startedAt || new Date().toISOString());
        setShowResumePrompt(false);
        toast.success(`Retomando da pergunta ${savedProgress.currentQuestionIndex + 1} de ${savedProgress.totalQuestions}`);
    };

    const handleRestartQuiz = () => {
        quizProgressManager.clear(documentId);
        setSavedProgress(null);
        setCurrentQuestionIndex(0);
        setSelectedAnswerId(null);
        setAnswerStatus('unanswered');
        setFeedback(null);
        setCorrectAnswersCount(0);
        setQuestionResults({});
        setQuizStartedAt(new Date().toISOString());
        setShowResumePrompt(false);
        toast.info("Iniciando do começo");
    };
    
    const handleNextQuestion = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswerId(null);
            setAnswerStatus('unanswered');
            setFeedback(null);
        } else {
            const finalScore = (correctAnswersCount / questions.length) * 100;

            if (document?.quiz?.id) {
                try {
                    await apiClient.submitQuizResult(
                        document.quiz.id,
                        finalScore,
                        correctAnswersCount,
                        questions.length,
                        questionResults,
                        quizStartedAt || new Date().toISOString()
                    );
                    toast.success("Seu progresso foi salvo!");
                } catch (error) {
                    console.error("Falha ao submeter o resultado do quiz", error);
                    toast.error("Não foi possível salvar o seu resultado.");
                }
            }

            if (canResumeQuiz) {
                quizProgressManager.clear(documentId);
            }
            
            setShowResults(true);
            if (finalScore > 70) {
                setShowConfetti(true);
            }
        }
    };

    const toQuestionPayload = (question: Question) => ({
        id: question.id,
        text: question.text,
        answers: question.answers.map((answer) => ({
            id: answer.id,
            text: answer.text,
            explanation: answer.explanation,
            is_correct: answer.is_correct,
        })),
    });

    const handleQuestionUpdated = (updatedQuestion: Question) => {
        setQuestions((current) =>
            current.map((question) => question.id === updatedQuestion.id ? updatedQuestion : question)
        );
    };

    const handleDeleteQuestion = async () => {
        const target = questionPendingDelete;
        if (!target) return;

        setIsDeletingQuestion(true);
        try {
            await apiClient.deleteQuestionFromDocument(documentId, toQuestionPayload(target));
            const remainingQuestions = questions.filter((question) => question.id !== target.id);
            const wasCorrect = questionResults[target.id] === true;
            setQuestions(remainingQuestions);
            setQuestionResults((current) => {
                const next = { ...current };
                delete next[target.id];
                return next;
            });
            if (wasCorrect) {
                setCorrectAnswersCount((current) => Math.max(0, current - 1));
            }

            if (remainingQuestions.length === 0) {
                toast.success("Pergunta excluída. Não restaram questões neste quiz.");
                setQuestionPendingDelete(null);
                router.back();
                return;
            }

            setCurrentQuestionIndex((current) => Math.min(current, remainingQuestions.length - 1));
            setSelectedAnswerId(null);
            setAnswerStatus('unanswered');
            setFeedback(null);
            setQuestionPendingDelete(null);
            toast.success("Pergunta excluída com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao excluir pergunta", { description: error.message });
        } finally {
            setIsDeletingQuestion(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-center p-4 bg-background">
                <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Não foi possível carregar o Quiz</h1>
                <p className="text-muted-foreground mt-2">{error}</p>
                <Button asChild className="mt-6"><Link href={`/deck/${documentId}`}>Voltar ao Deck</Link></Button>
            </div>
        );
    }

    if (isLoading || !document) {
        return null;
    }

    if (showResumePrompt && savedProgress) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <ResumeStudyDialog
                    open={showResumePrompt}
                    onOpenChange={setShowResumePrompt}
                    title="Continuar quiz?"
                    progressLabel={`Você parou na pergunta ${savedProgress.currentQuestionIndex + 1} de ${savedProgress.totalQuestions}`}
                    onContinue={handleResumeQuiz}
                    onRestart={handleRestartQuiz}
                />
            </div>
        );
    }

    if (showResults) {
    const score = Math.round((correctAnswersCount / questions.length) * 100);

    const handleContentAdded = () => {
        // Recarrega o quiz quando novas perguntas são adicionadas
        toast.success("Novas perguntas carregadas!");
        window.location.reload();
    };

    return (
        <>
            {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
            
            <QuizPerformanceReport
                score={score}
                correctAnswersCount={correctAnswersCount}
                totalQuestions={questions.length}
                documentId={documentId}
                onRestart={() => window.location.reload()} 
                onBack={() => router.back()} 
                onContentAdded={handleContentAdded}
            />
        </>
    )
}

    if (!currentQuestion) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="relative mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-accent/50">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Sair
                        </Button>
                        <div className="text-center flex-1 mx-4 min-w-0">
                             <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                                {document.quiz?.title}
                            </h1>
                        </div>
                    <div className="flex items-center gap-2 rounded-full bg-[#48cfea]/15 px-3 py-1.5 text-[#0f766e] dark:bg-[#48cfea]/12 dark:text-[#48cfea]">
                            <div className="w-2 h-2 rounded-full bg-[#48cfea] animate-pulse" />
                            <span className="text-sm font-medium">
                                {currentQuestionIndex + 1}/{questions.length}
                            </span>
                        </div>
                    </div>
                </header>
                
                <div className="mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500 delay-100">
                    <Progress value={progressPercentage} className="h-2 bg-[#48cfea]/20" indicatorClassName="bg-[#48cfea]" />
                    <div className="flex justify-between items-center mt-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Pergunta {currentQuestionIndex + 1}</span>
                        <span>{Math.round(progressPercentage)}% concluído</span>
                    </div>
                </div>
                <QuestionStage
                    question={currentQuestion}
                    questionLabel={currentQuestionIndex + 1}
                    selectedAnswerId={selectedAnswerId}
                    onSelectAnswer={setSelectedAnswerId}
                    answerStatus={answerStatus}
                    feedback={feedback}
                    isChecking={isChecking}
                    onCheck={handleCheckAnswer}
                    onNext={handleNextQuestion}
                    onEdit={() => {
                        setEditingQuestion(currentQuestion);
                        setIsEditQuestionOpen(true);
                    }}
                    onDelete={() => setQuestionPendingDelete(currentQuestion)}
                    nextLabel={currentQuestionIndex === questions.length - 1 ? "Ver Resultados" : "Próxima"}
                    hideNextArrow={currentQuestionIndex === questions.length - 1}
                    theme={{
                        badge: "bg-[#48cfea]/15",
                        badgeText: "text-[#0f766e] dark:text-[#48cfea]",
                        hoverBorder: "hover:border-[#48cfea]/80",
                        hoverBg: "hover:bg-[#48cfea]/5",
                        selectedBorder: "border-[#48cfea]",
                        selectedBg: "bg-[#48cfea]/5",
                        selectedBadge: "bg-[#48cfea]",
                        selectedBadgeText: "text-black",
                        primaryButton: "bg-[#48cfea] hover:bg-[#48cfea]/90 text-black",
                        radioItem: "border-[#48cfea]/45 text-[#48cfea] data-[state=checked]:border-[#48cfea] [&_[data-slot=radio-group-indicator]_svg]:fill-[#48cfea]",
                    }}
                />
                <EditQuestionModal
                    documentId={documentId}
                    question={editingQuestion}
                    isOpen={isEditQuestionOpen}
                    onClose={() => setIsEditQuestionOpen(false)}
                    onUpdate={handleQuestionUpdated}
                />
                <AlertDialog open={Boolean(questionPendingDelete)} onOpenChange={(open) => !open && setQuestionPendingDelete(null)}>
                    <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md border-black/10 dark:border-white/10 dark:bg-[#171922] sm:w-full">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Essa ação remove a pergunta do quiz e persiste no sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletingQuestion}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteQuestion}
                                disabled={isDeletingQuestion}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
