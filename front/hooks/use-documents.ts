import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api'

interface Document {
  id: number
  file_path: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  extracted_text?: string
  user_id: number
  folder_id?: number
}

interface DocumentWithFlashcards extends Document {
  flashcard_count: number
  is_ready: boolean
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentWithFlashcards[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchDocuments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      setError('')
      
      const docs = await apiClient.getDocuments()
      
      if (!mountedRef.current) return

      // Para cada documento, buscar flashcards se estiver completo
      const docsWithFlashcards = await Promise.all(
        docs.map(async (doc) => {
          let flashcard_count = 0
          let is_ready = false

          if (doc.status === 'COMPLETED') {
            try {
              const flashcards = await apiClient.getDocumentFlashcards(doc.id)
              flashcard_count = flashcards.length
              is_ready = flashcard_count > 0
            } catch (error) {
              console.warn(`Failed to fetch flashcards for document ${doc.id}:`, error)
            }
          }

          return {
            ...doc,
            flashcard_count,
            is_ready
          }
        })
      )

      if (mountedRef.current) {
        setDocuments(docsWithFlashcards)
      }
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Erro ao carregar documentos')
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  const startPolling = useCallback(() => {
    // Limpa polling anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Inicia novo polling a cada 5 segundos
    intervalRef.current = setInterval(() => {
      // Só faz polling se houver documentos em processamento
      const hasProcessing = documents.some(doc => doc.status === 'PROCESSING')
      if (hasProcessing && mountedRef.current) {
        fetchDocuments(false) // Não mostrar loading durante polling
      }
    }, 5000)
  }, [documents, fetchDocuments])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    fetchDocuments(true)
  }, [fetchDocuments])

  // Effect principal
  useEffect(() => {
    mountedRef.current = true
    fetchDocuments(true)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchDocuments])

  // Effect para controlar polling baseado em documentos em processamento
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'PROCESSING')
    
    if (hasProcessing) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [documents, startPolling, stopPolling])

  const addDocument = useCallback((newDoc: Document) => {
    setDocuments(prev => [
      {
        ...newDoc,
        flashcard_count: 0,
        is_ready: false
      },
      ...prev
    ])
  }, [])

  return {
    documents,
    isLoading,
    error,
    refresh,
    addDocument,
    hasProcessingDocs: documents.some(doc => doc.status === 'PROCESSING')
  }
}