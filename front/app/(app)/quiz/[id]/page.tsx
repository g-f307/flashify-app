// front/app/(app)/quiz/[id]/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Document, Question, Answer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, ArrowLeft, CheckCircle, XCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Confetti from "react-confetti";

type AnswerStatus = 'unanswered' | 'correct' | 'incorrect';
type AnswerFeedback = {
    isCorrect: boolean;
    correctAnswerId: number;
    explanation: string;
};

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
                    setQuestions(doc.quiz.questions);
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
    const progressPercentage = (currentQuestionIndex / questions.length) * 100;
    
    const handleCheckAnswer = async () => {
        if (!selectedAnswerId) {
            toast.warning("Por favor, selecione uma alternativa.");
            return;
        }
        setIsChecking(true);
        try {
            // A API de verificação precisa ser implementada
            // const result = await apiClient.checkQuizAnswer(currentQuestion.id, selectedAnswerId);
            // setFeedback(result);
            // setAnswerStatus(result.isCorrect ? 'correct' : 'incorrect');
            // if (result.isCorrect) {
            //     setCorrectAnswersCount(prev => prev + 1);
            // }
            toast.info("Funcionalidade de verificação de resposta ainda não implementada no apiClient.");
            // Mocking a result for now
            const mockIsCorrect = Math.random() > 0.5;
            setAnswerStatus(mockIsCorrect ? 'correct' : 'incorrect');
            if(mockIsCorrect) setCorrectAnswersCount(prev => prev + 1);
            setFeedback({ isCorrect: mockIsCorrect, correctAnswerId: currentQuestion.answers.find(a => a.is_correct)?.id ?? 0, explanation: "Esta é uma explicação de exemplo."});

        } catch (err) {
            toast.error("Erro ao verificar a resposta.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswerId(null);
            setAnswerStatus('unanswered');
            setFeedback(null);
        } else {
            // Fim do quiz
            setShowResults(true);
            if((correctAnswersCount / questions.length) > 0.7) {
                setShowConfetti(true);
            }
        }
    };

    // Render States
    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error) return (
        <div className="flex flex-col justify-center items-center h-screen text-center p-4">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Não foi possível carregar o Quiz</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button asChild className="mt-6"><Link href={`/deck/${documentId}`}>Voltar ao Deck</Link></Button>
        </div>
    );
    if (!document || !currentQuestion) return null;

    if (showResults) {
        const score = Math.round((correctAnswersCount / questions.length) * 100);
        return (
            <>
                {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
                <div className="flex flex-col justify-center items-center h-screen text-center p-4 animate-in fade-in-50 duration-500">
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
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="relative mb-6 text-center">
                 <Button variant="ghost" size="sm" asChild className="absolute top-0 left-0">
                    <Link href={`/deck/${documentId}`}><ArrowLeft className="w-4 h-4 mr-2" /> Sair do Quiz</Link>
                </Button>
                <h1 className="text-2xl font-bold pt-1">{document.quiz?.title}</h1>
            </header>

            <div className="mb-4">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">Pergunta {currentQuestionIndex + 1} de {questions.length}</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl leading-relaxed">{currentQuestion.text}</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={String(selectedAnswerId)}
                        onValueChange={(value) => setSelectedAnswerId(Number(value))}
                        disabled={answerStatus !== 'unanswered'}
                    >
                        {currentQuestion.answers.map((answer) => {
                            const isSelected = selectedAnswerId === answer.id;
                            const isCorrect = feedback?.correctAnswerId === answer.id;
                            
                            return (
                                <Label
                                    key={answer.id}
                                    htmlFor={`ans-${answer.id}`}
                                    className={cn(
                                        "flex items-center gap-4 p-4 border rounded-lg transition-all cursor-pointer",
                                        "hover:bg-muted/50",
                                        answerStatus !== 'unanswered' && !isCorrect && "text-muted-foreground",
                                        isSelected && answerStatus === 'unanswered' && "border-primary",
                                        answerStatus === 'correct' && isCorrect && "border-green-500 bg-green-500/10 text-green-700 font-semibold",
                                        answerStatus === 'incorrect' && isSelected && "border-destructive bg-destructive/10 text-destructive font-semibold",
                                        answerStatus === 'incorrect' && isCorrect && "border-green-500 bg-green-500/10"
                                    )}
                                >
                                    <RadioGroupItem value={String(answer.id)} id={`ans-${answer.id}`} />
                                    <span>{answer.text}</span>
                                </Label>
                            )
                        })}
                    </RadioGroup>

                    {feedback && (
                        <div className={cn(
                            "mt-4 p-4 rounded-lg animate-in fade-in-50",
                            feedback.isCorrect ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
                        )}>
                            <div className="flex items-center gap-2 font-bold mb-2">
                                {feedback.isCorrect ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                {feedback.isCorrect ? "Correto!" : "Incorreto!"}
                            </div>
                            <p className="text-sm">{feedback.explanation}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="mt-6 flex justify-end">
                {answerStatus === 'unanswered' ? (
                    <Button onClick={handleCheckAnswer} disabled={!selectedAnswerId || isChecking}>
                        {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                        Verificar
                    </Button>
                ) : (
                    <Button onClick={handleNextQuestion}>
                        {currentQuestionIndex === questions.length - 1 ? "Ver Resultados" : "Próxima Pergunta"}
                    </Button>
                )}
            </div>
        </div>
    );
}