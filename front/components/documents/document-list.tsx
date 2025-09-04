'use client'

import { useDocuments } from '@/hooks/use-documents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiClient } from '@/lib/api'
import { Play, FileText, Image, Clock, RefreshCw, AlertCircle, CheckCircle, X, Ban } from 'lucide-react'
import { useState } from 'react'

interface Document {
  id: number
  file_path: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  extracted_text?: string
  user_id: number
  folder_id?: number
  flashcard_count: number
  is_ready: boolean
  processing_progress?: number
  current_step?: string
  can_cancel?: boolean
}

interface DocumentListProps {
  onStudyDocument?: (document: Document) => void
}

export function DocumentList({ onStudyDocument }: DocumentListProps) {
  const { documents, isLoading, error, refresh, hasProcessingDocs } = useDocuments()
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set())

  const handleCancelProcessing = async (documentId: number) => {
    if (cancellingIds.has(documentId)) return
    
    setCancellingIds(prev => new Set([...prev, documentId]))
    try {
      await apiClient.cancelDocumentProcessing(documentId)
      refresh() // Refresh the document list
    } catch (error) {
      console.error('Failed to cancel processing:', error)
    } finally {
      setCancellingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(documentId)
        return newSet
      })
    }
  }

  const getDocumentTitle = (filePath: string) => {
    if (filePath.startsWith('text_')) {
      return filePath.split('_').slice(2).join('_') || 'Documento de Texto'
    }
    return filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Documento'
  }

  const getDocumentIcon = (filePath: string) => {
    if (filePath.includes('.pdf') || filePath.includes('PDF')) {
      return <FileText className="w-5 h-5" />
    }
    if (filePath.includes('.jpg') || filePath.includes('.png') || filePath.includes('.jpeg')) {
      return <Image className="w-5 h-5" />
    }
    return <FileText className="w-5 h-5" />
  }

  const getStatusBadge = (document: Document) => {
    switch (document.status) {
      case 'PROCESSING':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 animate-pulse">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin border-2 border-transparent border-t-blue-500" />
            Processando...
          </Badge>
        )
      case 'COMPLETED':
        if (document.is_ready) {
          return (
            <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800 border-green-300">
              <CheckCircle className="w-3 h-3" />
              Pronto
            </Badge>
          )
        } else {
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Finalizando...
            </Badge>
          )
        }
      case 'FAILED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Erro
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-600 border-gray-300">
            <Ban className="w-3 h-3" />
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{document.status}</Badge>
    }
  }

  const getStatusDescription = (document: Document) => {
    if (document.status === 'PROCESSING') {
      if (document.current_step) {
        return `${document.processing_progress || 0}% - ${document.current_step}`
      }
      return `${document.processing_progress || 0}% - Processando...`
    }
    if (document.status === 'COMPLETED') {
      if (document.is_ready) {
        return `${document.flashcard_count} flashcards prontos`
      } else {
        return 'Aguardando finalização...'
      }
    }
    if (document.status === 'FAILED') {
      return document.current_step || 'Falha no processamento'
    }
    if (document.status === 'CANCELLED') {
      return 'Processamento cancelado'
    }
    return 'Status desconhecido'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="mb-4">{error}</p>
            <Button 
              onClick={refresh} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum documento encontrado.</p>
            <p className="text-sm">Faça upload de arquivos ou crie flashcards a partir de texto.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {hasProcessingDocs && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              Processando documentos em segundo plano...
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Atualizar
            </Button>
          </div>
        </div>
      )}
      {documents.map((document) => (
        <Card key={document.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getDocumentIcon(document.file_path)}
                <div>
                  <CardTitle className="text-base">
                    {getDocumentTitle(document.file_path)}
                  </CardTitle>
                  <CardDescription>
                    {getStatusDescription(document)}
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(document)}
            </div>
          </CardHeader>
          
          {/* Progress bar for processing documents */}
          {document.status === 'PROCESSING' && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {document.current_step || 'Processando...'}
                  </span>
                  <span className="text-sm font-medium text-blue-600">
                    {document.processing_progress || 0}%
                  </span>
                </div>
                <Progress 
                  value={document.processing_progress || 0} 
                  className="w-full h-2"
                />
                {document.can_cancel && (
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      variant="outline"
                      disabled={cancellingIds.has(document.id)}
                      onClick={() => handleCancelProcessing(document.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {cancellingIds.has(document.id) ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          )}

          {/* Study button for completed documents */}
          {document.status === 'COMPLETED' && document.is_ready && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Pronto para estudo
                </span>
                <Button 
                  size="sm"
                  onClick={() => onStudyDocument?.(document)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Estudar
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}