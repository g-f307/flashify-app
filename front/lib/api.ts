import { AuthContextType } from "@/contexts/auth-context"; 
import { AcquisitionContext } from "@/lib/acquisition";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9000';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  profile_picture_url?: string; 
  provider: 'local' | 'google';
  is_team: boolean;
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
  acquisition_context?: AcquisitionContext | null;
}

export interface AnalyticsOverview {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  activated_users_7d: number;
  users_with_decks: number;
  users_who_studied: number;
  users_who_completed_quiz: number;
  decks_created_7d: number;
  decks_completed_7d: number;
}

export interface AcquisitionBreakdownItem {
  source: string;
  users: number;
}

export interface AcquisitionSummary {
  unattributed_users: number;
  top_sources: AcquisitionBreakdownItem[];
  top_campaigns: AcquisitionBreakdownItem[];
}

export interface AnalyticsUserRow {
  id: number;
  username: string;
  email: string;
  provider: string;
  created_at: string;
  last_login_at: string | null;
  first_login_at: string | null;
  first_deck_created_at: string | null;
  first_study_at: string | null;
  first_quiz_at: string | null;
  activated_at: string | null;
  lifecycle_stage: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  total_decks: number;
  flashcards_studied: number;
  quizzes_completed: number;
}

export interface AnalyticsFilters {
  days?: number;
  provider?: "local" | "google";
  utm_source?: string;
  utm_campaign?: string;
  lifecycle_stage?: string;
  include_internal?: boolean;
  limit?: number;
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
  title?: string | null;
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
  srs_enabled?: boolean;
  flashcards_pending?: number;
  questions_pending?: number;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  type: 'concept' | 'code' | 'diagram' | 'example' | 'comparison';
  document_id: number;
}

export interface FlashcardBulkItemInput {
  id?: number;
  front: string;
  back: string;
  type?: Flashcard["type"];
  is_deleted?: boolean;
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

export interface ProgressStats {
  cards_studied_week: number;
  streak_days: number;
  flashcard_accuracy: number;
  flashcard_weekly_activity: number[];
  quizzes_completed_week: number;
  quiz_average_score: number;
}

export interface DashboardSummary {
  reviewed_decks_today: number;
  flashcards_reviewed_today: number;
  quizzes_completed_today: number;
  last_active_document_id: number | null;
  last_activity_at: string | null;
}

export interface StreakCalendarDay {
  date: string;
  day: number;
  weekday: number;
  status: "before" | "active" | "today" | "upcoming" | "missed";
  has_activity: boolean;
}

export interface StreakCalendarSummary {
  month: number;
  year: number;
  today: string;
  current_streak: number;
  active_days: number;
  days: StreakCalendarDay[];
}

export interface StreakCalendarRangeSummary {
  start_date: string;
  end_date: string;
  today: string;
  current_streak: number;
  days: StreakCalendarDay[];
}

export interface SrsStats {
  flashcards_pending: number;
  questions_pending: number;
  srs_enabled: boolean;
  next_review_time: string | null;
  pending_priorities: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface SrsGroups {
  new_cards: number;
  needs_review: number;
  learning: number;
  almost_mastered: number;
  total: number;
}

export interface QuizSrsGroups {
  new_questions: number;
  wrong: number;
  correct: number;
  total: number;
}

export interface FolderWithDocuments extends Folder {
  documents: Document[];
}

export interface LibraryData {
  folders: FolderWithDocuments[];
  root_documents: Document[];
}

export interface Answer {
  id: number;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

export interface AnswerBulkInput {
  id?: number;
  text: string;
  is_correct: boolean;
  explanation?: string;
}

export interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

export interface QuestionBulkItemInput {
  id?: number;
  text: string;
  answers: AnswerBulkInput[];
  is_deleted?: boolean;
}

export interface Quiz {
  id: number;
  title: string;
  document_id?: number;
  questions: Question[];
}

export interface CheckAnswerResponse {
  is_correct: boolean;
  correct_answer_id: number;
  explanation: string;
}

export interface GuidedStudyStep {
  id: string;
  type: "flashcard" | "question";
  order: number;
  flashcard_id?: number | null;
  question_id?: number | null;
  front?: string | null;
  back?: string | null;
  prompt?: string | null;
  answers: Answer[];
}

export interface GuidedStudyTopic {
  id: string;
  title: string;
  order: number;
  steps: GuidedStudyStep[];
}

export interface GuidedStudySummary {
  topics_count: number;
  steps_count: number;
  flashcards_count: number;
  questions_count: number;
  is_fallback: boolean;
}

export interface GuidedStudy {
  document_id: number;
  title: string;
  mode: "guided";
  topics: GuidedStudyTopic[];
  summary: GuidedStudySummary;
}

export interface GuidedStudyProgress {
  document_id: number;
  completed_step_ids: string[];
  total_steps: number;
  started_at: string;
  last_accessed_at: string;
  completed_at: string | null;
  is_completed: boolean;
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

export interface GenerationLimitInfo {
  used: number;
  remaining: number;
  limit: number;
  hours_until_reset: number;
}

// 🆕 NOVO TIPO PARA ERRO DE LIMITE
export interface LimitExceededError {
  message: string;
  limit: number;
  used: number;
  hours_until_reset: number;
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

type CreateFromTextParams = {
  text: string;
  title: string;
  folderId?: number;
  generates_flashcards: boolean;
  generates_quizzes: boolean;
  contentType: string;
  num_flashcards: number;
  difficulty: string;
  num_questions: number;
};

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

  private buildQuery(
    params: Record<string, string | number | boolean | undefined | null> | AnalyticsFilters
  ): string {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      search.set(key, String(value));
    });

    const serialized = search.toString();
    return serialized ? `?${serialized}` : "";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { useJsonContentType?: boolean } = {}
  ): Promise<T> {
    const { useJsonContentType = true, ...fetchOptions } = options;

    const token = this.getToken();
    const headers: HeadersInit = { ...fetchOptions.headers };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

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

    // 🆕 TRATAMENTO ESPECIAL PARA 429 (Too Many Requests)
    if (res.status === 429) {
      const errorData = await res.json().catch(() => ({ 
        detail: { 
          message: "Limite diário atingido",
          limit: 10,
          used: 10,
          hours_until_reset: 24
        } 
      }));
      
      const limitError: LimitExceededError = typeof errorData.detail === 'string' 
        ? {
            message: "Limite diário de gerações atingido",
            limit: 10,
            used: 10,
            hours_until_reset: 24
          }
        : errorData.detail;
      
      const error = new Error("LIMIT_EXCEEDED");
      (error as any).limitInfo = limitError;
      throw error;
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

  async googleLogin(code: string, acquisitionContext?: AcquisitionContext | null): Promise<Token> {
    const response = await fetch(`${this.baseURL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, acquisition_context: acquisitionContext }),
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

  async getAnalyticsOverview(filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> {
    return this.request<AnalyticsOverview>(`/analytics/overview${this.buildQuery(filters)}`);
  }

  async getAcquisitionSummary(filters: AnalyticsFilters = {}): Promise<AcquisitionSummary> {
    return this.request<AcquisitionSummary>(`/analytics/acquisition${this.buildQuery(filters)}`);
  }

  async getAnalyticsUsers(filters: AnalyticsFilters = {}): Promise<AnalyticsUserRow[]> {
    return this.request<AnalyticsUserRow[]>(`/analytics/users${this.buildQuery(filters)}`);
  }

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

  async createDocumentFromText(params: CreateFromTextParams): Promise<Document> {
    return this.request<Document>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({
        text: params.text,
        title: params.title,
        folder_id: params.folderId,
        generate_flashcards: params.generates_flashcards,
        generate_quizzes: params.generates_quizzes,
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

  async bulkUpdateDocumentFlashcards(
    documentId: number,
    flashcards: FlashcardBulkItemInput[]
  ): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/documents/${documentId}/flashcards/bulk`, {
      method: "PUT",
      body: JSON.stringify({ flashcards }),
    });
  }

  async bulkUpdateDocumentQuiz(
    documentId: number,
    questions: QuestionBulkItemInput[]
  ): Promise<Quiz> {
    return this.request<Quiz>(`/documents/${documentId}/quiz/bulk`, {
      method: "PUT",
      body: JSON.stringify({ questions }),
    });
  }

  async deleteFlashcardFromDocument(
    documentId: number,
    flashcard: Flashcard
  ): Promise<Flashcard[]> {
    return this.bulkUpdateDocumentFlashcards(documentId, [
      {
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        type: flashcard.type,
        is_deleted: true,
      },
    ]);
  }

  async updateQuestionInDocument(
    documentId: number,
    question: QuestionBulkItemInput
  ): Promise<Quiz> {
    return this.bulkUpdateDocumentQuiz(documentId, [question]);
  }

  async deleteQuestionFromDocument(
    documentId: number,
    question: QuestionBulkItemInput
  ): Promise<Quiz> {
    return this.bulkUpdateDocumentQuiz(documentId, [
      {
        ...question,
        is_deleted: true,
      },
    ]);
  }

  async getGuidedStudy(documentId: number): Promise<GuidedStudy> {
    return this.request<GuidedStudy>(`/documents/${documentId}/guided-study`);
  }

  async getGuidedStudyProgress(documentId: number): Promise<GuidedStudyProgress | null> {
    try {
      return await this.request<GuidedStudyProgress>(`/documents/${documentId}/guided-study/progress`);
    } catch {
      return null;
    }
  }

  async saveGuidedStudyProgress(
    documentId: number,
    completedStepIds: string[],
    isCompleted: boolean
  ): Promise<GuidedStudyProgress> {
    return this.request<GuidedStudyProgress>(`/documents/${documentId}/guided-study/progress`, {
      method: "POST",
      body: JSON.stringify({ completed_step_ids: completedStepIds, is_completed: isCompleted }),
    });
  }

  async resetGuidedStudy(documentId: number): Promise<void> {
    await this.request<{ message: string }>(`/documents/${documentId}/guided-study/restructure`, {
      method: "POST",
    });
  }

  async cancelDocumentProcessing(documentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${documentId}/cancel`, {
      method: 'POST',
    });
  }

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

  async logStudyForFlashcard(flashcardId: number, accuracy: number): Promise<void> {
    try {
      await this.request<void>(`/flashcards/${flashcardId}/log_study`, {
        method: 'POST',
        body: JSON.stringify({ accuracy }),
      });
    } catch (error) {
      console.error("Falha ao registar o estudo do flashcard:", error);
      throw error;
    }
  }

  async getReviewFlashcardsByDocument(documentId: number): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/progress/review-flashcards/${documentId}`);
  }

  async getReviewQuiz(documentId: number): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/review/${documentId}`);
  }

  async getSrsStats(documentId: number): Promise<SrsStats> {
    return this.request<SrsStats>(`/progress/srs-stats/${documentId}`);
  }

  async getSrsGroups(documentId: number): Promise<SrsGroups> {
    return this.request<SrsGroups>(`/progress/srs-groups/${documentId}`);
  }

  async getSrsGroupCards(documentId: number, group: string): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/progress/srs-group-cards/${documentId}?group=${group}`);
  }

  async getQuizSrsGroups(documentId: number): Promise<QuizSrsGroups> {
    return this.request<QuizSrsGroups>(`/progress/quiz-srs-groups/${documentId}`);
  }

  async getQuizSrsGroupQuestions(documentId: number, group: string): Promise<Quiz> {
    return this.request<Quiz>(`/progress/quiz-srs-group-questions/${documentId}?group=${group}`);
  }

  async toggleSrs(documentId: number, srs_enabled: boolean): Promise<any> {
    return this.request(`/documents/${documentId}/srs`, {
      method: 'PATCH',
      body: JSON.stringify({ srs_enabled }),
    });
  }

  async getProgressStats(): Promise<ProgressStats> {
    const timezoneOffset = new Date().getTimezoneOffset();
    return this.request<ProgressStats>(`/progress/stats?utc_offset_minutes=${timezoneOffset}`);
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const timezoneOffset = new Date().getTimezoneOffset();
    return this.request<DashboardSummary>(`/progress/dashboard-summary?utc_offset_minutes=${timezoneOffset}`);
  }

  async getStreakCalendar(month?: number, year?: number): Promise<StreakCalendarSummary> {
    const timezoneOffset = new Date().getTimezoneOffset();
    const search = new URLSearchParams({
      utc_offset_minutes: String(timezoneOffset),
    });

    if (month) search.set("month", String(month));
    if (year) search.set("year", String(year));

    return this.request<StreakCalendarSummary>(`/progress/streak-calendar?${search.toString()}`);
  }

  async getStreakCalendarRange(startDate: string, days = 7): Promise<StreakCalendarRangeSummary> {
    const timezoneOffset = new Date().getTimezoneOffset();
    const search = new URLSearchParams({
      utc_offset_minutes: String(timezoneOffset),
      start_date: startDate,
      days: String(days),
    });

    return this.request<StreakCalendarRangeSummary>(`/progress/streak-calendar-range?${search.toString()}`);
  }

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

  async updateFolder(folderId: number, name: string): Promise<Folder> {
    return this.request<Folder>(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(folderId: number, deleteDecks: boolean): Promise<void> {
    let endpoint = `/folders/${folderId}`;
    if (deleteDecks) {
      endpoint += `?delete_decks=true`;
    }

    await this.request<void>(endpoint, {
      method: 'DELETE',
    });
  }

  async moveDocumentToFolder(documentId: number, folderId: number | null): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId }),
    });
  }

  async getDocumentStats(documentId: number): Promise<DeckStats> {
    return this.request<DeckStats>(`/stats/document/${documentId}`);
  }

  async submitQuizResult(
    quizId: number, 
    score: number, 
    correctAnswers: number, 
    totalQuestions: number,
    questionResults?: Record<number, boolean>
  ): Promise<any> {
    return this.request(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        question_results: questionResults || {},
      })
    });
  }

  // 🆕 Novos métodos para adicionar conteúdo
  async addFlashcardsToDocument(
    documentId: number,
    numFlashcards: number,
    difficulty: string
  ): Promise<Flashcard[]> {
    return this.request<Flashcard[]>(`/documents/${documentId}/add-flashcards`, {
      method: 'POST',
      body: JSON.stringify({
        num_flashcards: numFlashcards,
        difficulty
      })
    });
  }

  async addQuestionsToQuiz(
    documentId: number,
    numQuestions: number,
    difficulty: string
  ): Promise<Quiz> {
    return this.request<Quiz>(`/documents/${documentId}/add-questions`, {
      method: 'POST',
      body: JSON.stringify({
        num_questions: numQuestions,
        difficulty
      })
    });
  }

    async getGenerationLimitStatus(): Promise<GenerationLimitInfo> {
    return this.request<GenerationLimitInfo>('/documents/generation-limit');
  }

}

export const apiClient = new ApiClient();
