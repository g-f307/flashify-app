// --- CONFIGURAÇÃO E INTERFACES ---
import { AuthContextType } from "@/contexts/auth-context"; 

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  profile_picture_url?: string; 
  provider: 'local' | 'google';
}

export interface PasswordUpdateRequest {
  current_password: string;
  new_password: string;
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
  created_at: string; 
  total_flashcards: number;
  studied_flashcards: number;
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

// NOVA INTERFACE PARA ESTATÍSTICAS
export interface ProgressStats {
  cards_studied_week: number;
  streak_days: number;
  general_accuracy: number;
  weekly_activity: number[];
}

export interface FolderWithDocuments extends Folder {
  documents: Document[];
}

// Atualize a interface LibraryData para usar o novo tipo
export interface LibraryData {
  folders: FolderWithDocuments[]; // <-- MUDANÇA AQUI
  root_documents: Document[];
}

// --- CLASSE DO CLIENTE API ---

class ApiClient {
  
  private baseURL: string;
  private auth: AuthContextType | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setAuth(auth: AuthContextType) {
    this.auth = auth;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  // --- CORREÇÃO: Método request ajustado para usar a classe Headers ---
  private async request<T>(
    endpoint: string,
    // Define um tipo de opções customizado que inclui a nossa flag
    options: RequestInit & { useJsonContentType?: boolean } = {}
  ): Promise<T> {
    // Separa a nossa flag customizada do resto das opções que irão para o fetch
    const { useJsonContentType = true, ...fetchOptions } = options;

    const token = this.getToken();
    const headers: HeadersInit = { ...fetchOptions.headers };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Adiciona o Content-Type apenas se for JSON e o corpo não for FormData
    if (useJsonContentType && !(fetchOptions.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
    };

    const res = await fetch(`${this.baseURL}${endpoint}`, config);

    if (res.status === 401) {
      this.auth?.logout();
      throw new Error("Sessão expirada. Por favor, faça login novamente.");
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || "Ocorreu um erro desconhecido.");
    }

    if (res.headers.get("Content-Length") === "0" || res.status === 204) {
      return {} as T;
    }

    return res.json();
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

  async uploadDocument(
    file: File,
    title: string,
    num_flashcards: number,
    difficulty: string,
    folderId?: number // <-- Adicione o parâmetro opcional
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("num_flashcards", String(num_flashcards));
    formData.append("difficulty", difficulty);
    if (folderId) { // <-- Adicione o folderId se ele existir
      formData.append("folder_id", String(folderId));
    }

    return this.request<Document>("/documents/upload", {
      method: "POST",
      body: formData,
      useJsonContentType: false,
    });
  }


  async createDocumentFromText(
text: string, title: string, num_flashcards: number, p0?: string, folderId?: number
  ): Promise<Document> {
    return this.request<Document>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({ text, title, num_flashcards, folder_id: folderId}),
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

  async changePassword(data: PasswordUpdateRequest): Promise<void> {
        return this.request<void>('/users/me/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
  }

  async markFlashcardAsStudied(flashcardId: number): Promise<void> {
    await this.request<void>(`/flashcards/${flashcardId}/study`, {
      method: 'POST',
    });
  }

  async updateFlashcard(flashcardId: number, data: { front?: string, back?: string }): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/${flashcardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(documentId: number): Promise<void> {
    return this.request<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // 🔽 NOVA FUNÇÃO PARA ENVIAR O FEEDBACK DE ESTUDO 🔽
  async logStudyForFlashcard(flashcardId: number, accuracy: number): Promise<void> {
    try {
      await this.request<void>(`/flashcards/${flashcardId}/log_study`, {
        method: 'POST',
        body: JSON.stringify({ accuracy }),
      });
    } catch (error) {
      console.error("Falha ao registar o estudo do flashcard:", error);
      // Lançar o erro permite que o componente que chamou saiba que falhou
      throw error;
    }
  }

  async getReviewFlashcards(): Promise<Flashcard[]> {
    return this.request<Flashcard[]>('/progress/review-flashcards');
  }

  // NOVO MÉTODO PARA BUSCAR ESTATÍSTICAS
  async getProgressStats(): Promise<ProgressStats> {
    // getTimezoneOffset() retorna a diferença em minutos (ex: 240 para UTC-4)
    const timezoneOffset = new Date().getTimezoneOffset();
    return this.request<ProgressStats>(`/progress/stats?utc_offset_minutes=${timezoneOffset}`);
  }

  // Busca todas as pastas e os decks na raiz
  async getLibraryData(): Promise<LibraryData> {
    return this.request<LibraryData>('/folders/library');
  }

  async getFolder(folderId: number): Promise<FolderWithDocuments> {
    return this.request<FolderWithDocuments>(`/folders/${folderId}`);
  }

  async createFolder(name: string): Promise<Folder> {
    return this.request<Folder>('/folders/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Renomeia uma pasta
  async updateFolder(folderId: number, name: string): Promise<Folder> {
    return this.request<Folder>(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  // Deleta uma pasta
  async deleteFolder(folderId: number, deleteDecks: boolean): Promise<void> {
    let endpoint = `/folders/${folderId}`;
    if (deleteDecks) {
      endpoint += `?delete_decks=true`;
    }

    await this.request<void>(endpoint, {
      method: 'DELETE',
    });
  }

  // Move um deck para uma pasta (ou para a raiz, se folderId for null)
  async moveDocumentToFolder(documentId: number, folderId: number | null): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId }),
    });
  }
  
}

export const apiClient = new ApiClient();