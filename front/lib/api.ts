// --- CONFIGURAÇÃO E INTERFACES ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Folder {
  id: number;
  name: string;
}

export interface Document {
  id: number;
  file_path: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  extracted_text?: string;
  user_id: number;
  folder_id?: number;
  processing_progress?: number;
  current_step?: string;
  can_cancel?: boolean;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  type: 'concept' | 'code' | 'diagram' | 'example' | 'comparison';
  document_id: number;
}

export interface FlashcardConversation {
  id: number;
  user_message: string;
  assistant_response: string;
  created_at: string;
  flashcard_id: number;
}

export interface ChatResponse {
  response: string;
  conversation_id: number;
}

// --- CLASSE DO CLIENTE API ---

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  // --- CORREÇÃO: Método request ajustado para usar a classe Headers ---
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    // Usamos a classe Headers para construir os cabeçalhos de forma segura
    const headers = new Headers(options.headers);

    // Definimos um Content-Type padrão se nenhum for fornecido
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers, // Passamos o objeto Headers construído
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido na resposta da API.' }));
        throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
      }
      
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
        throw error;
    }
  }

  // --- MÉTODOS DE AUTENTICAÇÃO (sem alteração) ---

  async login(data: LoginRequest): Promise<Token> {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await fetch(`${this.baseURL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Usuário ou senha inválidos.' }));
      throw new Error(errorData.detail);
    }

    return response.json();
  }

  async register(data: RegisterRequest): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async googleLogin(code: string): Promise<Token> {
    const response = await fetch(`${this.baseURL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Falha na autenticação com o Google.' }))
        throw new Error(errorData.detail);
    }
    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me');
  }

  // --- MÉTODOS DE PASTAS E DOCUMENTOS (sem alteração) ---

  async getFolders(): Promise<Folder[]> {
    return this.request<Folder[]>('/folders/');
  }

  async createFolder(name: string): Promise<Folder> {
    return this.request<Folder>('/folders/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async uploadDocument(file: File, folderId?: number): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);

    const url = folderId ? `/documents/upload?folder_id=${folderId}` : '/documents/upload';
    
    const headers: HeadersInit = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Erro ao fazer upload do arquivo.' }));
      throw new Error(errorData.detail);
    }

    return response.json();
  }

  async createDocumentFromText(text: string, title?: string): Promise<Document> {
    return this.request<Document>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({ text, title }),
    });
  }
  
  async getDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/documents/');
  }

  async getDocument(documentId: number): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}`);
  }
  
  async getDocumentFlashcards(documentId: number): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/documents/${documentId}/flashcards`);
  }

  async cancelDocumentProcessing(documentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${documentId}/cancel`, {
      method: 'POST',
    });
  }

  // --- MÉTODOS DE FLASHCARDS E CHAT (sem alteração) ---

  async getFlashcardDetails(flashcardId: number): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/${flashcardId}`);
  }

  async chatWithFlashcard(flashcardId: number, message: string): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/flashcards/${flashcardId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getFlashcardConversations(flashcardId: number): Promise<FlashcardConversation[]> {
    return this.request<FlashcardConversation[]>(`/flashcards/${flashcardId}/conversations`);
  }
}

export const apiClient = new ApiClient();