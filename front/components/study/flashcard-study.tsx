'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EnhancedFlashcardRenderer } from './enhanced-flashcard-renderer'
import { RotateCcw, Play, Check, X, ArrowLeft, MessageCircle } from 'lucide-react'
import { FlashcardChat } from './flashcard-chat'

interface Flashcard {
  id: number
  front: string
  back: string
  type: 'concept' | 'code' | 'diagram' | 'example' | 'comparison'
  document_id: number
}

interface FlashcardStudyProps {
  documentId: number
  onBack?: () => void
}

export function FlashcardStudy({ documentId, onBack }: FlashcardStudyProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  })
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    fetchFlashcards()
  }, [documentId])

  const fetchFlashcards = async () => {
    try {
      setIsLoading(true)
      const cards = await apiClient.getDocumentFlashcards(documentId)
      setFlashcards(cards)
      setStudyStats({ correct: 0, incorrect: 0, total: cards.length })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao carregar flashcards')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardFlip = () => {
    setIsFlipping(true)
    setTimeout(() => {
      setShowAnswer(!showAnswer)
      setIsFlipping(false)
    }, 150)
  }

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setShowAnswer(false)
        setIsFlipping(false)
      }, 150)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipping(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1)
        setShowAnswer(false)
        setIsFlipping(false)
      }, 150)
    }
  }

  const handleAnswer = (correct: boolean) => {
    setStudyStats(prev => ({
      ...prev,
      correct: correct ? prev.correct + 1 : prev.correct,
      incorrect: correct ? prev.incorrect : prev.incorrect + 1
    }))
    handleNext()
  }

  const resetStudy = () => {
    setCurrentIndex(0)
    setShowAnswer(false)
    setStudyStats({ correct: 0, incorrect: 0, total: flashcards.length })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando flashcards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={fetchFlashcards}>Tentar Novamente</Button>
        </CardContent>
      </Card>
    )
  }

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 mb-4">
            Nenhum flashcard encontrado para este documento.
          </p>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100
  const isLastCard = currentIndex === flashcards.length - 1
  
  // Study completed
  if (currentIndex >= flashcards.length) {
    const accuracy = studyStats.total > 0 ? Math.round((studyStats.correct / studyStats.total) * 100) : 0
    
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                🎉 Parabéns! Estudo Concluído
              </h2>
              <p className="text-gray-600">Você terminou todos os flashcards!</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{studyStats.correct}</div>
                <div className="text-sm text-gray-500">Corretas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{studyStats.incorrect}</div>
                <div className="text-sm text-gray-500">Incorretas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                <div className="text-sm text-gray-500">Precisão</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={resetStudy}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Estudar Novamente
              </Button>
              {onBack && (
                <Button onClick={onBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showChat) {
    return (
      <div className="max-w-4xl mx-auto">
        <FlashcardChat 
          flashcard={currentCard}
          onClose={() => setShowChat(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-between">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowChat(true)}
              variant="outline"
              size="sm"
              className="text-lime-accent dark:text-primary border-lime-accent/50 dark:border-primary/50"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Badge variant="outline">
              {currentIndex + 1} de {flashcards.length}
            </Badge>
          </div>
        </div>
        
        <Progress value={progress} className="w-full" />
        
        <div className="text-sm text-gray-500">
          Corretas: {studyStats.correct} | Incorretas: {studyStats.incorrect}
        </div>
      </div>

      {/* Flashcard */}
      <Card 
        className={`min-h-[400px] max-h-[600px] cursor-pointer transition-transform duration-300 hover:shadow-lg overflow-auto ${
          isFlipping ? 'scale-95' : ''
        }`}
        onClick={handleCardFlip}
      >
        <CardContent className="flex items-center justify-center p-8 h-full min-h-[300px]">
          <div className="text-center space-y-4 w-full max-w-2xl">
            {!showAnswer ? (
              <>
                <div className="text-sm text-primary font-medium mb-4">
                  PERGUNTA
                </div>
                <EnhancedFlashcardRenderer 
                  content={currentCard.front}
                  type={currentCard.type}
                  isAnswer={false}
                />
                <p className="text-sm text-gray-500 mt-8">
                  Clique para ver a resposta
                </p>
              </>
            ) : (
              <>
                <div className="text-sm text-primary font-medium mb-4">
                  RESPOSTA
                </div>
                <EnhancedFlashcardRenderer 
                  content={currentCard.back}
                  type={currentCard.type}
                  isAnswer={true}
                />
                <p className="text-sm text-gray-500 mt-8">
                  Como você se saiu?
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {!isLastCard && (
            <Button
              onClick={handleNext}
              disabled={!showAnswer}
              size="sm"
            >
              Próximo
              <Play className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {showAnswer && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              className="border-red-300 text-red-600 hover:bg-red-50"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              Difícil
            </Button>
            <Button
              onClick={() => handleAnswer(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Fácil
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}