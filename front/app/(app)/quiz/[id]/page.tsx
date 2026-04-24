"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { apiClient, Document, Question, Answer, CheckAnswerResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
    Loader2, 
    AlertTriangle, 
    ArrowLeft, 
    CheckCircle, 
    XCircle, 
    Sparkles,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useLoading } from "@/components/providers/loading-provider"; 
import { QuizPerformanceReport } from "@/components/quiz/quiz-performance-report"; 

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

    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

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
                } else {
                     const doc = await apiClient.getDocument(documentId);
                     if (!doc.quiz || doc.quiz.questions.length === 0) {
                         setError("Este deck não tem um quiz válido para iniciar.");
                     } else {
                        setDocument(doc);
                        setQuestions([...doc.quiz.questions]);
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
        
    }, [documentId]); 

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
                        questionResults
                    );
                    toast.success("Seu progresso foi salvo!");
                } catch (error) {
                    console.error("Falha ao submeter o resultado do quiz", error);
                    toast.error("Não foi possível salvar o seu resultado.");
                }
            }
            
            setShowResults(true);
            if (finalScore > 70) {
                setShowConfetti(true);
            }
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
                        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-sm font-medium text-primary">
                                {currentQuestionIndex + 1}/{questions.length}
                            </span>
                        </div>
                    </div>
                </header>
                
                <div className="mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500 delay-100">
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between items-center mt-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Pergunta {currentQuestionIndex + 1}</span>
                        <span>{Math.round(progressPercentage)}% concluído</span>
                    </div>
                </div>
                <Card className="overflow-hidden border-muted animate-in fade-in-50 zoom-in-95 duration-500 delay-200">
                    <CardHeader className="bg-muted/30 border-b border-muted">
                        <div className="flex items-start gap-4 p-2">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-lg">{currentQuestionIndex + 1}</span>
                            </div>
                            <CardTitle className="text-lg sm:text-xl leading-relaxed pt-1.5 flex-1">
                                {currentQuestion.text}
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 pb-6">
                        <RadioGroup
                            value={String(selectedAnswerId)}
                            onValueChange={(value) => setSelectedAnswerId(Number(value))}
                            disabled={answerStatus !== 'unanswered'}
                            className="space-y-3"
                        >
                            {currentQuestion.answers.map((answer, index) => {
                                const isCorrect = feedback?.correct_answer_id === answer.id;
                                const isSelected = selectedAnswerId === answer.id;
                                const letters = ['A', 'B', 'C', 'D', 'E'];

                                return (
                                    <Label
                                        key={answer.id}
                                        htmlFor={`ans-${answer.id}`}
                                        className={cn(
                                            "flex items-start gap-4 p-4 border rounded-xl transition-all duration-300 cursor-pointer group",
                                            "hover:shadow-md hover:scale-[1.02]",
                                            answerStatus === 'unanswered' && "hover:border-primary/80 hover:bg-primary/5",
                                            answerStatus !== 'unanswered' && !isCorrect && "opacity-60",
                                            isSelected && answerStatus === 'unanswered' && "border-primary bg-primary/5 scale-[1.02]",
                                            answerStatus === 'correct' && isCorrect && "border-green-500 bg-green-500/10",
                                            answerStatus === 'incorrect' && isSelected && "border-destructive bg-destructive/10",
                                            answerStatus === 'incorrect' && isCorrect && "border-green-500 bg-green-500/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                                            isSelected && answerStatus === 'unanswered' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                            answerStatus === 'correct' && isCorrect && "bg-green-500 text-white",
                                            answerStatus === 'incorrect' && isSelected && "bg-destructive text-white",
                                            answerStatus === 'incorrect' && isCorrect && "bg-green-500 text-white"
                                        )}>
                                            {letters[index]}
                                        </div>
                                        
                                        <div className="flex-1 flex items-center gap-3">
                                            <RadioGroupItem
                                                value={String(answer.id)}
                                                id={`ans-${answer.id}`}
                                                className="border-border"
                                            />
                                            <span className="text-sm sm:text-base leading-relaxed">
                                                {answer.text}
                                            </span>
                                        </div>
                                        
                                        {answerStatus !== 'unanswered' && (
                                            <div className="flex-shrink-0">
                                                {isCorrect ? (
                                                    <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in-50 duration-300" />
                                                ) : isSelected ? (
                                                    <XCircle className="w-6 h-6 text-destructive animate-in zoom-in-50 duration-300" />
                                                ) : null}
                                            </div>
                                        )}
                                    </Label>
                                )
                            })}
                        </RadioGroup>
                        
                        {feedback && (
                            <div className={cn(
                                "mt-6 p-4 rounded-xl animate-in fade-in-50 slide-in-from-bottom-4 duration-500 border",
                                feedback.is_correct
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-destructive/10 border-destructive/30"
                            )}>
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                                        feedback.is_correct ? "bg-green-500" : "bg-destructive"
                                    )}>
                                        {feedback.is_correct ? <CheckCircle className="w-5 h-5 text-white"/> : <XCircle className="w-5 h-5 text-white"/>}
                                    </div>
                                    <div className="flex-1">
                                        <p className={cn(
                                            "text-sm leading-relaxed",
                                            feedback.is_correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                                        )}>
                                            {feedback.explanation
                                                .replace(/^Correto!\s*/i, '')
                                                .replace(/^Incorreto[o|a]?[!]?\s*/i, '')
                                                .replace(/^Errado[!]?\s*/i, '')
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="mt-6 flex flex-col sm:flex-row sm:justify-end animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-300">
                    {answerStatus === 'unanswered' ? (
                        <Button
                            onClick={handleCheckAnswer}
                            disabled={!selectedAnswerId || isChecking}
                            size="lg"
                            className="w-full sm:w-auto sm:min-w-[140px]"
                        >
                            {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            Verificar
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNextQuestion}
                            size="lg"
                            className="w-full sm:w-auto sm:min-w-[140px] group"
                        >
                            {currentQuestionIndex === questions.length - 1 ? "Ver Resultados" : "Próxima"}
                            {currentQuestionIndex < questions.length - 1 && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
