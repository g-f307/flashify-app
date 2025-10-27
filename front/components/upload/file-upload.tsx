'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UploadCloud, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  onSubmit: (file: File, title: string) => Promise<void>
  isLoading: boolean
  optionsComponent: ReactNode
}

export function FileUpload({ onSubmit, isLoading, optionsComponent }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de arquivo inválido. Apenas PDF, JPEG e PNG são suportados.')
      return
    }
    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Por favor, selecione um arquivo.')
      return
    }
    if (!title.trim()) {
      toast.error('Por favor, dê um título ao seu deck.')
      return
    }
    await onSubmit(file, title)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title-file">Título do Deck</Label>
        <Input
          id="title-file"
          placeholder="Ex: Biologia - Fotossíntese"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-input-control">Arquivo</Label>
        <label
          htmlFor="file-input-control"
          className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
        >
          {file ? (
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              <span>{file.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Clique para enviar</span> ou arraste e solte
              </p>
              <p className="text-xs text-muted-foreground">PDF, PNG ou JPG</p>
            </div>
          )}
          <Input 
            id="file-input-control" 
            type="file" 
            className="hidden" 
            onChange={handleFileChange} 
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={isLoading}
          />
        </label>
      </div>

      {optionsComponent}

      <Button type="submit" className="w-full !mt-6" disabled={isLoading || !file}>
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