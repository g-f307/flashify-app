"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageCircle, Send, X, Loader2 } from "lucide-react"
import { apiClient, type Flashcard, type FlashcardConversation } from "@/lib/api"
import { cn } from "@/lib/utils"

interface FlashcardChatProps {
  flashcard: Flashcard
  onClose: () => void
}

export function FlashcardChat({ flashcard, onClose }: FlashcardChatProps) {
  const [message, setMessage] = useState("")
  const [conversations, setConversations] = useState<FlashcardConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversations])

  useEffect(() => {
    fetchConversationHistory()
  }, [flashcard.id])

  const fetchConversationHistory = async () => {
    try {
      setIsFetchingHistory(true)
      const history = await apiClient.getFlashcardConversations(flashcard.id)
      setConversations(history)
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    } finally {
      setIsFetchingHistory(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage("")
    setIsLoading(true)

    try {
      const response = await apiClient.chatWithFlashcard(flashcard.id, userMessage)
      
      // Adiciona a nova conversa localmente
      const newConversation: FlashcardConversation = {
        id: response.conversation_id,
        user_message: userMessage,
        assistant_response: response.response,
        created_at: new Date().toISOString(),
        flashcard_id: flashcard.id
      }
      
      setConversations(prev => [...prev, newConversation])
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      // Você pode adicionar um toast de erro aqui
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (text: string) => {
    // Detectar e formatar código
    if (text.includes("```")) {
      const parts = text.split(/```(\w+)?\n?/)
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // É código
          return (
            <pre key={index} className="bg-muted p-3 rounded-md my-2 overflow-x-auto">
              <code className="text-sm">{part}</code>
            </pre>
          )
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>
      })
    }
    
    return <span className="whitespace-pre-wrap">{text}</span>
  }

  if (isFetchingHistory) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-card-border">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-lime-accent dark:text-primary" />
            Chat sobre o Flashcard
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg glow-on-hover">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-lime-accent dark:text-primary" />
          Chat sobre o Flashcard
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      {/* Contexto do Flashcard */}
      <div className="px-4 py-3 bg-muted/50 border-b">
        <div className="text-xs text-muted-foreground mb-1">FLASHCARD</div>
        <div className="text-sm font-medium">{flashcard.front}</div>
        <Separator className="my-2" />
        <div className="text-sm text-muted-foreground line-clamp-2">{flashcard.back}</div>
      </div>

      <CardContent className="p-0">
        {/* Área de Mensagens */}
        <ScrollArea className="h-96 px-4">
          <div className="py-4 space-y-4">
            {conversations.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Faça uma pergunta sobre este flashcard</p>
                <p className="text-xs mt-1">Eu vou responder baseado no contexto do documento</p>
              </div>
            )}
            
            {conversations.map((conv) => (
              <div key={conv.id} className="space-y-3">
                {/* Mensagem do Usuário */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-lime-accent dark:bg-primary text-lime-accent-foreground dark:text-primary-foreground px-3 py-2 rounded-lg rounded-br-md">
                    <div className="text-sm">{formatMessage(conv.user_message)}</div>
                  </div>
                </div>
                
                {/* Resposta do Assistente */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-muted px-3 py-2 rounded-lg rounded-bl-md">
                    <div className="text-sm">{formatMessage(conv.assistant_response)}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-muted px-3 py-2 rounded-lg rounded-bl-md">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pensando...
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input de Mensagem */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Faça uma pergunta sobre este tópico..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || isLoading}
              size="sm"
              className="bg-lime-accent hover:bg-lime-accent/90 text-lime-accent-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}