// front/app/(app)/quiz/[id]/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document, Question, Answer, CheckAnswerResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, ArrowLeft, CheckCircle, XCircle, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Confetti from "react-confetti";

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';
type AnswerFeedback = CheckAnswerResponse;

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = Number(params.id);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
    const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('unanswered');
    const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!documentId) return;
        const fetchQuiz = async () => {
            try {
                const doc = await apiClient.getDocument(documentId);
                if (!doc.quiz || doc.quiz.questions.length === 0) {
                    setError("Este deck não tem um quiz válido para iniciar.");
                } else {
                    setDocument(doc);
                    setQuestions(doc.quiz.questions.sort(() => Math.random() - 0.5));
                }
            } catch (err) {
                setError("Não foi possível carregar o quiz.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuiz();
    }, [documentId]);

    const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);
    const progressPercentage = useMemo(() => {
        if (questions.length === 0) return 0;
        return ((currentQuestionIndex + 1) / questions.length) * 100;
    }, [currentQuestionIndex, questions.length]);


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
            } else {
                console.error("Resposta da API inválida ou vazia:", result);
                throw new Error("O servidor não retornou uma resposta válida.");
            }
        } catch (err: any) {
            toast.error("Erro ao verificar a resposta.", { description: err.message });
        } finally {
            setIsChecking(false);
        }
    };

    // --- CORREÇÃO APLICADA AQUI ---
    // A função foi marcada como 'async' para que o 'await' funcione corretamente.
    const handleNextQuestion = async () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswerId(null);
            setAnswerStatus('unanswered');
            setFeedback(null);
        } else {
            // Fim do quiz
            const finalScore = (correctAnswersCount / questions.length) * 100;

            // Submete o resultado para o backend
            if (document?.quiz?.id) {
                try {
                    await apiClient.submitQuizResult(
                        document.quiz.id,
                        finalScore,
                        correctAnswersCount,
                        questions.length
                    );
                    toast.success("O seu progresso foi guardado!");
                } catch (error) {
                    console.error("Falha ao submeter o resultado do quiz", error);
                    toast.error("Não foi possível guardar o seu resultado.");
                }
            }
            
            setShowResults(true);
            if (finalScore > 70) {
                setShowConfetti(true);
            }
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

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

    if (!document || !currentQuestion) {
        return null;
    }

    if (showResults) {
        const score = Math.round((correctAnswersCount / questions.length) * 100);
        return (
            <>
                {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
                <div className="flex flex-col justify-center items-center h-screen text-center p-4 animate-in fade-in-50 duration-500 bg-background">
                    <Sparkles className="w-16 h-16 text-yellow-400 mb-4" />
                    <h1 className="text-3xl sm:text-4xl font-bold">Quiz Concluído!</h1>
                    <p className="text-muted-foreground mt-2">Veja o seu desempenho abaixo.</p>
                    <Card className="mt-8 w-full max-w-md">
                        <CardContent className="p-6 space-y-4">
                            <div className="text-center">
                                <p className="text-lg font-medium">A sua pontuação</p>
                                <p className="text-6xl font-bold text-primary mt-2">{score}%</p>
                            </div>
                            <div className="flex justify-between items-center text-lg p-3 bg-muted rounded-lg">
                                <span>Respostas Corretas</span>
                                <span className="font-bold">{correctAnswersCount} de {questions.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex gap-4 mt-8">
                        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
                        <Button variant="outline" asChild><Link href={`/deck/${documentId}`}>Voltar ao Deck</Link></Button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="relative mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="sm" asChild className="hover:bg-accent/50">
                            <Link href={`/deck/${documentId}`}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Sair
                            </Link>
                        </Button>
                        
                        <div className="text-center flex-1 mx-4">
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
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>Pergunta {currentQuestionIndex + 1}</span>
                        <span>{Math.round(progressPercentage)}% concluído</span>
                    </div>
                </div>

                <Card className="overflow-hidden border-border animate-in fade-in-50 zoom-in-95 duration-500 delay-200">
                    <CardHeader className="bg-muted/30 border-b border-border">
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
                                            <span className="text-base leading-relaxed">
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
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                        feedback.is_correct ? "bg-green-500" : "bg-destructive"
                                    )}>
                                        {feedback.is_correct ? <CheckCircle className="w-5 h-5 text-white"/> : <XCircle className="w-5 h-5 text-white"/>}
                                    </div>
                                    <h3 className={cn(
                                        "font-bold text-lg",
                                        feedback.is_correct ? "text-green-700 dark:text-green-400" : "text-destructive"
                                    )}>
                                        {feedback.is_correct ? "Resposta Correta!" : "Resposta Incorreta"}
                                    </h3>
                                </div>
                                <div className="pl-[44px] text-sm text-muted-foreground">
                                    <p className="leading-relaxed">{feedback.explanation}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-6 flex justify-end animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-300">
                    {answerStatus === 'unanswered' ? (
                        <Button
                            onClick={handleCheckAnswer}
                            disabled={!selectedAnswerId || isChecking}
                            size="lg"
                            className="min-w-[140px]"
                        >
                            {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            Verificar
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNextQuestion}
                            size="lg"
                            className="min-w-[140px] group"
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