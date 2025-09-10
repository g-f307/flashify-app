'use client'

import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Code, FileText, Layers, BookOpen, GitCompare } from 'lucide-react'

interface EnhancedFlashcardRendererProps {
  content: string
  type?: 'concept' | 'code' | 'diagram' | 'example' | 'comparison'
  isAnswer?: boolean
}

export function EnhancedFlashcardRenderer({ 
  content, 
  type = 'concept',
  isAnswer = false 
}: EnhancedFlashcardRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && type === 'diagram' && isAnswer) {
      // Simple Mermaid rendering without external dependencies
      const mermaidBlocks = contentRef.current.querySelectorAll('code.language-mermaid, .mermaid')
      mermaidBlocks.forEach((block) => {
        const code = block.textContent || ''
        if (code.includes('graph') || code.includes('sequenceDiagram') || code.includes('flowchart')) {
          block.innerHTML = `<div class="bg-blue-50 p-4 rounded border text-center text-blue-800">📊 Diagrama: ${code.split('\n')[0]}</div>`
        }
      })
    }
  }, [content, type, isAnswer])

  const getTypeIcon = () => {
    switch (type) {
      case 'code':
        return <Code className="w-3 h-3" />
      case 'diagram':
        return <Layers className="w-3 h-3" />
      case 'example':
        return <BookOpen className="w-3 h-3" />
      case 'comparison':
        return <GitCompare className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'code':
        return 'Código'
      case 'diagram':
        return 'Diagrama'
      case 'example':
        return 'Exemplo'
      case 'comparison':
        return 'Comparação'
      default:
        return 'Conceito'
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case 'code':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'diagram':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'example':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'comparison':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let inCodeBlock = false
    let codeLanguage = ''
    let codeContent: string[] = []
    let key = 0

    for (const line of lines) {
      // Code block detection
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <div key={key++} className="my-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-xs text-gray-400 mb-2">{codeLanguage || 'code'}</div>
                <pre>{codeContent.join('\n')}</pre>
              </div>
            </div>
          )
          codeContent = []
          inCodeBlock = false
          codeLanguage = ''
        } else {
          // Start code block
          codeLanguage = line.replace('```', '').trim()
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeContent.push(line)
        continue
      }

      // Regular text processing
      if (line.trim() === '') {
        elements.push(<br key={key++} />)
      } else if (line.startsWith('# ')) {
        elements.push(<h3 key={key++} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h3>)
      } else if (line.startsWith('## ')) {
        elements.push(<h4 key={key++} className="text-base font-bold mt-3 mb-2">{line.slice(3)}</h4>)
      } else if (line.startsWith('- ')) {
        elements.push(<li key={key++} className="ml-4 list-disc">{line.slice(2)}</li>)
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={key++} className="border-l-4 border-primary/30 pl-4 italic text-gray-700 dark:text-gray-300 my-2">
            {line.slice(2)}
          </blockquote>
        )
      } else {
        // Regular paragraph with inline code handling
        const processedLine = line.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
        elements.push(
          <p key={key++} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{__html: processedLine}} />
        )
      }
    }

    return elements
  }

  return (
    <div className="space-y-3">
      {/* Type Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className={`flex items-center gap-1 text-xs ${getTypeColor()}`}>
          {getTypeIcon()}
          {getTypeLabel()}
        </Badge>
      </div>

      {/* Content */}
      <div ref={contentRef} className="text-left space-y-2 overflow-y-auto max-h-full">
        {renderContent(content)}
      </div>
    </div>
  )
}