'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Brain } from 'lucide-react'

interface TextInputProps {
  onSuccess?: (document: any) => void
}

export function TextInput({ onSuccess }: TextInputProps) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!text.trim()) {
      setError('Por favor, insira algum texto.')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const document = await apiClient.createDocumentFromText(
        text,
        title || '',
        10, // default number of flashcards
        'medium' // default difficulty
      )
      onSuccess?.(document)
      setTitle('')
      setText('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao gerar flashcards')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="glow-on-hover">
      <CardHeader>
        <CardTitle>Inserir Texto</CardTitle>
        <CardDescription>
          Cole ou digite o conteúdo que você quer transformar em flashcards
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Conjunto</Label>
            <Input
              id="title"
              placeholder="Ex: Biologia - Fotossíntese"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              placeholder="Cole aqui o texto que você quer transformar em flashcards..."
              className="min-h-[200px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              disabled={isGenerating}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {isGenerating && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Gerando flashcards com IA... Isso pode levar alguns segundos.
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isGenerating}
          >
            <Brain className="w-4 h-4 mr-2" />
            {isGenerating ? 'Gerando...' : 'Gerar Flashcards'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}