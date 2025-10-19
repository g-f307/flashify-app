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
  generates_flashcards: boolean;
  generates_quizzes: boolean;
  extracted_text?: string;
  user_id: number;
  folder_id?: number;
  processing_progress?: number;
  current_step?: string;
  can_cancel?: boolean;
  created_at: string;
  total_flashcards: number;
  studied_flashcards: number;
  has_quiz?: boolean; 
  quiz?: Quiz;
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
  flashcard_accuracy: number; // ✅ Renomeado
  flashcard_weekly_activity: number[]; // ✅ Renomeado
  quizzes_completed_week: number; // ✅ Novo
  quiz_average_score: number; // ✅ Novo
}

export interface FolderWithDocuments extends Folder {
  documents: Document[];
}

// Atualize a interface LibraryData para usar o novo tipo
export interface LibraryData {
  folders: FolderWithDocuments[]; // <-- MUDANÇA AQUI
  root_documents: Document[];
}

export interface Answer {
  id: number;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

export interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

export interface Quiz {
  id: number;
  title: string;
  questions: Question[];
}

export interface CheckAnswerResponse {
  is_correct: boolean;
  correct_answer_id: number;
  explanation: string;
}

export interface FlashcardStats {
  known: number;
  learning: number;
  total: number;
  progress_percentage: number;
}

export interface QuizStatSummary {
  total_attempts: number;
  average_score: number | null;
  last_score: number | null;
}

export interface DeckStats {
  flashcards: FlashcardStats;
  quiz: QuizStatSummary | null;
  mastery_history: { date: string; mastery: number }[];
}

type UploadDocumentParams = {
  file: File;
  title: string;
  folderId?: number;
  generates_flashcards: boolean;
  generates_quizzes: boolean;
  contentType: string;
  num_flashcards: number;
  difficulty: string;
  num_questions: number;
};

// Agrupa todos os parâmetros para criação a partir de texto
type CreateFromTextParams = {
  text: string;
  title: string;
  folderId?: number;
  contentType: string;
  num_flashcards: number;
  difficulty: string;
  num_questions: number;
};

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

  async uploadDocument(params: UploadDocumentParams): Promise<Document> {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("title", params.title);
    if (params.folderId) {
      formData.append("folder_id", String(params.folderId));
    }
    formData.append("content_type", params.contentType);
    formData.append("num_flashcards", String(params.num_flashcards));
    formData.append("difficulty", params.difficulty);
    formData.append("num_questions", String(params.num_questions));

    formData.append("generates_flashcards", String(params.generates_flashcards));
    formData.append("generates_quizzes", String(params.generates_quizzes));

    return this.request<Document>("/documents/upload", {
      method: "POST",
      body: formData,
      useJsonContentType: false,
    });
  }

  // --- MÉTODO DE CRIAÇÃO POR TEXTO ATUALIZADO ---
  async createDocumentFromText(params: CreateFromTextParams): Promise<Document> {
    return this.request<Document>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({
        text: params.text,
        title: params.title,
        folder_id: params.folderId,
        // Adicionando novos campos
        content_type: params.contentType,
        num_flashcards: params.num_flashcards,
        difficulty: params.difficulty,
        num_questions: params.num_questions,
      }),
    });
  }

  async generateQuizForDocument(documentId: number): Promise<Quiz> {
    return this.request<Quiz>(`/documents/${documentId}/generate-quiz`, {
      method: 'POST',
    });
  }

  async checkQuizAnswer(questionId: number, answerId: number): Promise<any> {
      console.log('🔧 API Client - Enviando:', {
          question_id: questionId,
          answer_id: answerId
      });
      
      const result = await this.request('/quizzes/check-answer', {
          method: 'POST',
          body: JSON.stringify({
              question_id: questionId,
              answer_id: answerId
          })
      });
      
      console.log('🔧 API Client - Recebido:', result);
      return result;
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

  async generateFlashcardsForDocument(documentId: number): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/documents/${documentId}/generate-flashcards`, {
      method: 'POST',
    });
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

  // Adicione este novo método para buscar estatísticas
  async getDocumentStats(documentId: number): Promise<DeckStats> {
    return this.request<DeckStats>(`/stats/document/${documentId}`);
  }

  // Adicione este novo método para submeter o resultado do quiz
  async submitQuizResult(
    quizId: number, 
    score: number, 
    correctAnswers: number, 
    totalQuestions: number
  ): Promise<any> {
    return this.request(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
      })
    });
  }
  
}

export const apiClient = new ApiClient();