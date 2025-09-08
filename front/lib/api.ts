const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000'

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface Folder {
  id: number
  name: string
}

export interface Document {
  id: number
  file_path: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  extracted_text?: string
  user_id: number
  folder_id?: number
  processing_progress?: number
  current_step?: string
  can_cancel?: boolean
}

export interface Flashcard {
  id: number
  front: string
  back: string
  type: 'concept' | 'code' | 'diagram' | 'example' | 'comparison'
  document_id: number
}

export interface FlashcardConversation {
  id: number
  user_message: string
  assistant_response: string
  created_at: string
  flashcard_id: number
}

export interface ChatMessage {
  message: string
}

export interface ChatResponse {
  response: string
  conversation_id: number
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = API_BASE_URL
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
    }
  }

    private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Ajuste a tipagem aqui para ser mais específica
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Authentication
  async register(data: RegisterRequest): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)

    const response = await fetch(`${this.baseURL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `HTTP ${response.status}`)
    }

    const tokenResponse = await response.json()
    this.setToken(tokenResponse.access_token)
    return tokenResponse
  }

  async logout() {
    this.clearToken()
  }

  async getMe(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async loginWithGoogle(code: string): Promise<TokenResponse> {
    // Note que este método não precisa de 'Authorization' header
    const response = await fetch(`${this.baseURL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP ${response.status}`)
    }

    const tokenResponse = await response.json();
    this.setToken(tokenResponse.access_token);
    return tokenResponse;
}

  // Folders
  async getFolders(): Promise<Folder[]> {
    return this.request<Folder[]>('/folders/')
  }

  async createFolder(name: string): Promise<Folder> {
    return this.request<Folder>('/folders/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  // Documents
  async uploadDocument(file: File, folderId?: number): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)

    const url = folderId 
      ? `/documents/upload?folder_id=${folderId}`
      : '/documents/upload'

    const headers: HeadersInit = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async getDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/documents/')
  }

  async getDocument(documentId: number): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}`)
  }

  // Text generation
  async generateFlashcardsFromText(text: string, title?: string): Promise<Document> {
    return this.request<Document>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({ text, title }),
    })
  }

  // Flashcards
  async getDocumentFlashcards(documentId: number): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/documents/${documentId}/flashcards`)
  }

  async cancelDocumentProcessing(documentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${documentId}/cancel`, {
      method: 'POST',
    })
  }

  async getUserDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/users/documents')
  }

  // Flashcard Chat
  async chatWithFlashcard(flashcardId: number, message: string): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/flashcards/${flashcardId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  async getFlashcardConversations(flashcardId: number): Promise<FlashcardConversation[]> {
    return this.request<FlashcardConversation[]>(`/flashcards/${flashcardId}/conversations`)
  }

  async getFlashcardDetails(flashcardId: number): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/${flashcardId}`)
  }
}

export const apiClient = new ApiClient()