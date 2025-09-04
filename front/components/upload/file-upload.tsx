'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, ImageIcon } from 'lucide-react'

interface FileUploadProps {
  folderId?: number
  onSuccess?: (document: any) => void
}

export function FileUpload({ folderId, onSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de arquivo inválido. Apenas PDF, JPEG e PNG são suportados.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const document = await apiClient.uploadDocument(file, folderId)
      onSuccess?.(document)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer upload')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de Arquivo</CardTitle>
        <CardDescription>
          Faça upload de PDF ou imagens para gerar flashcards automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Arraste e solte seu arquivo aqui ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <Button asChild disabled={isUploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                </label>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              PDF
            </div>
            <div className="flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              JPG/PNG
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {isUploading && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Fazendo upload e processando arquivo... Isso pode levar alguns minutos.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}