'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TextInputProps {
  onSubmit: (text: string, title: string, folderId?: number) => Promise<void>
  isLoading: boolean
  optionsComponent: ReactNode
}

export function TextInput({ onSubmit, isLoading, optionsComponent }: TextInputProps) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Por favor, dê um título ao seu deck.')
      return
    }
    
    if (!text.trim()) {
      toast.error('Por favor, insira o texto para gerar o conteúdo.')
      return
    }

    await onSubmit(text, title)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title-text">Título do Deck</Label>
        <Input
          id="title-text"
          placeholder="Ex: Biologia - Fotossíntese"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea
          id="content"
          placeholder="Cole aqui o tópico, texto ou resumo que você quer transformar em material de estudo..."
          className="min-h-[200px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {optionsComponent}

      <Button 
        type="submit" 
        className="w-full !mt-6"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          'Criar Deck'
        )}
      </Button>
    </form>
  )
}