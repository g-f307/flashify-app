"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient, Document, LimitExceededError, PdfInspectResponse } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfPagePicker } from "@/components/upload/pdf-page-picker";
import { cn } from "@/lib/utils";
import ContentLoader from "@/components/content-loader";
import { GenerationLimitAlert } from "@/components/generation-limit-alert";
import { LimitReachedDialog } from "@/components/limit-reached-dialog";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import {
  Loader2,
  ArrowLeft,
  UploadCloud,
  FileText,
  Sparkles,
  Settings2,
  AlertCircle,
  Type,
  FileUp,
  Layers,
  BrainCircuit,
  Combine,
  Sprout,
  Leaf,
  Trees,
  Map,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

type WizardStepId = "name" | "content" | "pdf-pages" | "customize" | "review";

type WizardData = {
  name: string;
  inputType: "text" | "upload";
  text: string;
  file: File | null;
  contentType: "flashcards" | "quiz" | "both";
  num_flashcards: number;
  difficulty: string;
  num_questions: number;
  study_language: string;
};

const STUDY_LANGUAGE_OPTIONS = [
  {
    value: "auto",
    label: "Detectar pelo material",
    description: "Mantém o idioma predominante do conteúdo enviado.",
  },
  {
    value: "pt-BR",
    label: "Português",
    description: "Gera respostas, alternativas e explicações em português.",
  },
  {
    value: "en",
    label: "Inglês",
    description: "Ideal para estudo de vocabulário e estruturas em inglês.",
  },
  {
    value: "es",
    label: "Espanhol",
    description: "Mantém o conteúdo pedagógico em espanhol.",
  },
  {
    value: "fr",
    label: "Francês",
    description: "Mantém respostas e explicações em francês.",
  },
  {
    value: "de",
    label: "Alemão",
    description: "Mantém respostas e explicações em alemão.",
  },
  {
    value: "it",
    label: "Italiano",
    description: "Mantém respostas e explicações em italiano.",
  },
] as const;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ACCEPTED_FILE_TYPES_STRING = ".pdf, .jpg, .jpeg, .png, .docx, .pptx";
const ACCEPTED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".pptx"];

const OUTPUT_THEMES = {
  flashcards: {
    badge: "bg-[#FACC15]/15 text-[#8a6400] dark:bg-[#FACC15]/12 dark:text-[#f2d772]",
    border: "border-[#FACC15]/30 dark:border-[#FACC15]/20",
    panel: "bg-[#FACC15]/7 dark:bg-[#FACC15]/6",
    text: "text-foreground",
    softText: "text-muted-foreground",
  },
  quiz: {
    badge: "bg-[#48cfea]/15 text-[#0f7893] dark:bg-[#48cfea]/12 dark:text-[#88e7ff]",
    border: "border-[#48cfea]/28 dark:border-[#48cfea]/20",
    panel: "bg-[#48cfea]/7 dark:bg-[#48cfea]/6",
    text: "text-foreground",
    softText: "text-muted-foreground",
  },
  guided: {
    badge: "bg-[#7FD9A0]/16 text-[#2d7d4c] dark:bg-[#7FD9A0]/12 dark:text-[#a7edc1]",
    border: "border-[#7FD9A0]/28 dark:border-[#7FD9A0]/20",
    panel: "bg-[#7FD9A0]/7 dark:bg-[#7FD9A0]/6",
    text: "text-foreground",
    softText: "text-muted-foreground",
  },
} as const;

const CREATE_MODE_STYLES = {
  flashcards: "data-[state=on]:border-[#FACC15] data-[state=on]:bg-[#FACC15] data-[state=on]:text-black font-semibold shadow-[0_4px_14px_-4px_rgba(250,204,21,0.5)] dark:data-[state=on]:border-[#FACC15] dark:data-[state=on]:bg-[#FACC15] dark:data-[state=on]:text-black",
  quiz: "data-[state=on]:border-[#48cfea] data-[state=on]:bg-[#48cfea] data-[state=on]:text-black font-semibold shadow-[0_4px_14px_-4px_rgba(72,207,234,0.5)] dark:data-[state=on]:border-[#48cfea] dark:data-[state=on]:bg-[#48cfea] dark:data-[state=on]:text-black",
  both: "data-[state=on]:border-[#7FD9A0] data-[state=on]:bg-[#7FD9A0] data-[state=on]:text-black font-semibold shadow-[0_4px_14px_-4px_rgba(127,217,160,0.5)] dark:data-[state=on]:border-[#7FD9A0] dark:data-[state=on]:bg-[#7FD9A0] dark:data-[state=on]:text-black",
} as const;

const CREATE_MODE_BASE_STYLES = {
  flashcards: "border-gray-200 bg-transparent text-muted-foreground hover:bg-muted/30 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-white/5",
  quiz: "border-gray-200 bg-transparent text-muted-foreground hover:bg-muted/30 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-white/5",
  both: "border-gray-200 bg-transparent text-muted-foreground hover:bg-muted/30 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-white/5",
} as const;

const CONTENT_SLIDER_STYLES = {
  flashcards:
    "[&_[data-slot=slider-track]]:bg-[#FACC15]/18 dark:[&_[data-slot=slider-track]]:bg-[#FACC15]/14 [&_[data-slot=slider-range]]:bg-[#FACC15] [&_[data-slot=slider-thumb]]:border-[#FACC15] [&_[data-slot=slider-thumb]]:bg-background",
  quiz:
    "[&_[data-slot=slider-track]]:bg-[#48cfea]/18 dark:[&_[data-slot=slider-track]]:bg-[#48cfea]/14 [&_[data-slot=slider-range]]:bg-[#48cfea] [&_[data-slot=slider-thumb]]:border-[#48cfea] [&_[data-slot=slider-thumb]]:bg-background",
} as const;

const DIFFICULTY_STYLES = {
  easy: "data-[state=on]:border-emerald-300 data-[state=on]:bg-emerald-500/10 data-[state=on]:text-foreground dark:data-[state=on]:border-emerald-500/35 dark:data-[state=on]:bg-emerald-500/8",
  medium: "data-[state=on]:border-amber-300 data-[state=on]:bg-amber-500/10 data-[state=on]:text-foreground dark:data-[state=on]:border-amber-500/35 dark:data-[state=on]:bg-amber-500/8",
  hard: "data-[state=on]:border-red-300 data-[state=on]:bg-red-500/10 data-[state=on]:text-foreground dark:data-[state=on]:border-red-500/35 dark:data-[state=on]:bg-red-500/8",
} as const;

interface CreationWizardProps {
  onCreationSuccess: () => void;
  folderId?: number;
}

function getFileExtension(file: File | null): string {
  if (!file) return "";
  return `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
}

function validatePdfPageSelection(selection: string, totalPages: number): string | null {
  const normalized = selection.trim();
  if (!normalized) {
    return "Informe pelo menos uma pagina ou selecione todas as paginas.";
  }

  const tokens = normalized.split(",");
  const pages = new Set<number>();

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) {
      return "Use formatos como 1,2,3 ou 1-5.";
    }

    if (!/^\d+(?:-\d+)?$/.test(token)) {
      return `Trecho invalido: ${token}.`;
    }

    if (token.includes("-")) {
      const [startStr, endStr] = token.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      if (start > end) {
        return `Intervalo invalido: ${token}.`;
      }
      for (let page = start; page <= end; page += 1) {
        if (page < 1 || page > totalPages) {
          return `A pagina ${page} precisa estar entre 1 e ${totalPages}.`;
        }
        pages.add(page);
      }
      continue;
    }

    const page = Number(token);
    if (page < 1 || page > totalPages) {
      return `A pagina ${page} precisa estar entre 1 e ${totalPages}.`;
    }
    pages.add(page);
  }

  if (!pages.size) {
    return "Nenhuma pagina valida foi informada.";
  }

  return null;
}

function parsePdfPageSelection(selection: string, totalPages: number): number[] {
  const tokens = selection.trim().split(",");
  const pages = new Set<number>();

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) continue;

    if (token.includes("-")) {
      const [startStr, endStr] = token.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      for (let page = start; page <= end; page += 1) {
        if (page >= 1 && page <= totalPages) {
          pages.add(page);
        }
      }
      continue;
    }

    const page = Number(token);
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function formatPdfPageSelection(pages: number[]): string {
  if (!pages.length) return "";

  const ranges: string[] = [];
  let rangeStart = pages[0];
  let previous = pages[0];

  for (let index = 1; index < pages.length; index += 1) {
    const current = pages[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }

    ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`);
    rangeStart = current;
    previous = current;
  }

  ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`);
  return ranges.join(",");
}

export function CreationWizard({ onCreationSuccess, folderId }: CreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepId>("name");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocument, setProcessingDocument] = useState<Document | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pdfInspectInfo, setPdfInspectInfo] = useState<PdfInspectResponse | null>(null);
  const [isInspectingPdf, setIsInspectingPdf] = useState(false);
  const [pageSelection, setPageSelection] = useState("");
  const [useAllPdfPages, setUseAllPdfPages] = useState(true);
  const [pageSelectionError, setPageSelectionError] = useState<string | null>(null);
  
  // 🆕 USAR O CONTEXT EM VEZ DE ESTADO LOCAL
  const { limitInfo, loading: loadingLimit, refreshLimitInfo, incrementUsage } = useGenerationLimit();
  
  // Estados de limite (apenas para dialog)
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogInfo, setLimitDialogInfo] = useState<LimitExceededError | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [data, setData] = useState<WizardData>({
    name: "",
    inputType: "text",
    text: "",
    file: null,
    contentType: "flashcards",
    num_flashcards: 10,
    difficulty: "Médio",
    num_questions: 5,
    study_language: "auto",
  });

  const requestedGeneratesFlashcards =
    data.contentType === "flashcards" || data.contentType === "both";
  const requestedGeneratesQuizzes =
    data.contentType === "quiz" || data.contentType === "both";
  const requestedGeneratesGuided = data.contentType === "both";
  const requestedGenerationUnits = data.contentType === "both" ? 2 : 1;
  const isPdfUpload = data.inputType === "upload" && getFileExtension(data.file) === ".pdf";
  const totalPdfPages = pdfInspectInfo?.total_pages || 0;
  const selectedPdfPages =
    !isPdfUpload || useAllPdfPages ? null : parsePdfPageSelection(pageSelection, totalPdfPages);
  const steps = [
    { id: "name" as const, name: "Nome", icon: Sparkles },
    { id: "content" as const, name: "Conteúdo", icon: FileText },
    ...(isPdfUpload ? [{ id: "pdf-pages" as const, name: "Páginas", icon: FileText }] : []),
    { id: "customize" as const, name: "Customizar", icon: Settings2 },
    { id: "review" as const, name: "Revisar", icon: CheckCircle2 },
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const sourceLabel =
    data.inputType === "text"
      ? "Texto colado"
      : data.file
        ? data.file.name
        : "Arquivo enviado";
  const pageSelectionLabel = !isPdfUpload
    ? null
    : useAllPdfPages
      ? "Todas as páginas"
      : `Páginas ${pageSelection.trim()}`;
  const outputSummary = [
    requestedGeneratesFlashcards
      ? {
          id: "flashcards",
          title: "Flashcards",
          description: `${data.num_flashcards} cards para revisão e memorização`,
        }
      : null,
    requestedGeneratesQuizzes
      ? {
          id: "quiz",
          title: "Quiz",
          description: `${data.num_questions} perguntas com dificuldade ${data.difficulty.toLowerCase()}`,
        }
      : null,
    requestedGeneratesGuided
      ? {
          id: "guided",
          title: "Estudo guiado",
          description: "Trilha montada automaticamente a partir de flashcards e quiz",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: keyof typeof OUTPUT_THEMES;
    title: string;
    description: string;
  }>;

  const resetPdfSelectionState = () => {
    setPdfInspectInfo(null);
    setIsInspectingPdf(false);
    setUseAllPdfPages(true);
    setPageSelection("");
    setPageSelectionError(null);
  };

  const applyPdfPageSelection = (pages: number[] | null) => {
    if (!pages || pages.length === 0) {
      setUseAllPdfPages(true);
      setPageSelection("");
      setPageSelectionError(null);
      return;
    }

    setUseAllPdfPages(false);
    setPageSelection(formatPdfPageSelection(pages));
    setPageSelectionError(null);
  };

  const handleNext = () => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const handleBack = () => {
    const previousStep = steps[currentStepIndex - 1];
    if (previousStep) {
      setCurrentStep(previousStep.id);
    }
  };

  const monitorProcessing = async (documentId: number) => {
    try {
      const document = await apiClient.getDocument(documentId);
      setProcessingDocument(document);

      if (document.status === 'COMPLETED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        const createdItems = [];
        if (data.contentType === 'flashcards' || data.contentType === 'both') {
            createdItems.push('Flashcards');
        }
        if (data.contentType === 'quiz' || data.contentType === 'both') {
            createdItems.push('Quiz');
        }
        if (data.contentType === 'both') {
            createdItems.push('Estudo guiado');
        }
        
        // 🎯 ATUALIZAR O LIMITE REAL APENAS QUANDO CONCLUIR COM SUCESSO
        await refreshLimitInfo();
        
        toast.success(`Deck "${data.name}" processado!`, {
          description: `${createdItems.join(' e ')} foram gerados com sucesso.`,
          duration: 4000,
        });
        
        onCreationSuccess();
        
      } else if (document.status === 'FAILED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // 🔄 REVERTER a atualização otimista em caso de falha
        await refreshLimitInfo();
        
        setIsProcessing(false); 
        toast.error("Falha ao processar o deck", {
          description: document.current_step || "Houve um erro durante o processamento.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao monitorar processamento:', error);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // 🔄 REVERTER em caso de erro também
      await refreshLimitInfo();
      
      setIsProcessing(false);
      toast.error("Não foi possível verificar o estado do deck.");
    }
  };

  useEffect(() => {
    if (currentStep === "pdf-pages" && !isPdfUpload) {
      setCurrentStep("content");
    }
  }, [currentStep, isPdfUpload]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const handleLimitError = (error: any) => {
    if (error.message === "LIMIT_EXCEEDED" && error.limitInfo) {
      setLimitDialogInfo(error.limitInfo);
      setShowLimitDialog(true);
      
      // 🆕 Atualiza o context também (sincronização extra)
      refreshLimitInfo();
    } else {
      toast.error("Falha ao criar deck", { 
        description: error.message || "Tente novamente mais tarde." 
      });
    }
  };

  const handleSubmit = async () => {
    if (!data.name.trim()) return toast.error("Por favor, dê um nome ao seu deck.");
    if (data.inputType === 'text' && !data.text.trim()) return toast.error("O conteúdo de texto não pode estar vazio.");
    if (data.inputType === 'upload' && !data.file) return toast.error("Por favor, selecione um arquivo para upload.");
    if (fileError) return toast.error(fileError);
    if (isPdfUpload && !pdfInspectInfo) return toast.error("Não foi possível carregar os metadados do PDF.");

    if (isPdfUpload && !useAllPdfPages) {
      const validationError = validatePdfPageSelection(
        pageSelection,
        totalPdfPages,
      );
      setPageSelectionError(validationError);
      if (validationError) {
        return toast.error("Revise o filtro de páginas informado.");
      }
    }

    // Verifica limite antes de submeter
    if (limitInfo && limitInfo.remaining < requestedGenerationUnits) {
      setLimitDialogInfo({
        message: "Limite diário atingido",
        limit: limitInfo.limit,
        used: limitInfo.used,
        hours_until_reset: limitInfo.hours_until_reset
      });
      setShowLimitDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let document: Document;
      
      const baseParams = {
        title: data.name,
        study_language: data.study_language === "auto" ? undefined : data.study_language,
        folderId: folderId,
        num_flashcards: data.num_flashcards,
        difficulty: data.difficulty,
        num_questions: data.num_questions,
        contentType: data.contentType, 
        generates_flashcards: requestedGeneratesFlashcards,
        generates_quizzes: requestedGeneratesQuizzes,
      };

      if (data.inputType === 'upload' && data.file) {
        document = await apiClient.uploadDocument({
          ...baseParams,
          file: data.file,
          pageSelection: isPdfUpload && !useAllPdfPages ? pageSelection.trim() : undefined,
        });
      } else {
        document = await apiClient.createDocumentFromText({ ...baseParams, text: data.text });
      }

      // 🆕 ATUALIZAR O CONTEXT - Isso vai refletir na sidebar IMEDIATAMENTE!
      incrementUsage(requestedGenerationUnits); // Atualização otimista (feedback imediato)
      
      // 🆕 Atualizar do servidor em background (garante sincronização)
      refreshLimitInfo().catch(err => {
        console.error('Erro ao atualizar limite:', err);
      });

      setIsSubmitting(false);
      setIsProcessing(true);
      setProcessingDocument(document);

      intervalRef.current = setInterval(() => monitorProcessing(document.id), 3000);
      monitorProcessing(document.id);

    } catch (error: any) {
      setIsSubmitting(false);
      handleLimitError(error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setFileError(null);
    resetPdfSelectionState();

    if (!file) return;

    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    const hasAcceptedType = !file.type || ACCEPTED_FILE_TYPES.includes(file.type);
    const hasAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.includes(fileExtension);

    if (!hasAcceptedType || !hasAcceptedExtension) {
      const errorMsg = "Tipo de arquivo inválido. Use PDF, JPG, PNG, DOCX ou PPTX.";
      setFileError(errorMsg);
      toast.error(errorMsg);
      setData({ ...data, file: null }); 
      e.target.value = ''; 
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errorMsg = `Ficheiro muito grande. O limite é ${MAX_FILE_SIZE_MB}MB.`;
      setFileError(errorMsg);
      toast.error(errorMsg);
      setData({ ...data, file: null }); 
      e.target.value = ''; 
      return;
    }

    setFileError(null);
    setData({ ...data, file, text: "" });

    if (fileExtension !== ".pdf") {
      return;
    }

    setIsInspectingPdf(true);
    try {
      const inspectInfo = await apiClient.inspectPdf(file);
      setPdfInspectInfo(inspectInfo);
    } catch (error: any) {
      const errorMsg = error.message || "Não foi possível inspecionar o PDF.";
      setFileError(errorMsg);
      setData({ ...data, file: null, text: "" });
      toast.error(errorMsg);
      e.target.value = '';
    } finally {
      setIsInspectingPdf(false);
    }
  };

  const WizardProgress = () => (
    <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3 py-3 sm:py-4 px-2 overflow-x-auto">
        {steps.map((s, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = s.id === currentStep;
          return (
            <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0",
                  isCompleted
                    ? "bg-[#FACC15] text-black shadow-[0_4px_12px_-4px_rgba(250,204,21,0.5)]"
                    : isActive
                      ? "bg-[#FACC15]/15 border-[1.5px] border-[#FACC15]/60 text-[#FACC15] dark:bg-[#FACC15]/12 dark:border-[#FACC15]/40"
                      : "bg-muted/60 text-muted-foreground/50 dark:bg-zinc-800/60"
                )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                    ) : (
                      <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                </div>
                <span className={cn(
                  "font-medium text-xs sm:text-sm hidden sm:inline transition-colors duration-300 whitespace-nowrap",
                  isCompleted ? "text-foreground" :
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground/60"
                )}>
                  {s.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-[1.5px] w-4 sm:w-6 md:w-10 rounded-full transition-all duration-500 flex-shrink-0",
                    isCompleted ? "bg-[#FACC15]/70" : "bg-border/50 dark:bg-zinc-700/50"
                  )}/>
                )}
            </div>
          );
        })}
    </div>
  );

  const renderStepContent = () => {
    if (isProcessing) {
      return (
        <div className="animate-in fade-in-50 duration-500">
          <CardContent className="flex justify-center items-center py-8 sm:py-12 px-4">
            <ContentLoader 
              currentStepMessage={processingDocument?.current_step}
              generatesFlashcards={requestedGeneratesFlashcards}
              generatesQuizzes={requestedGeneratesQuizzes}
              generatesGuided={requestedGeneratesGuided}
            />
          </CardContent>
        </div>
      );
    }

    return (
      <div key={currentStep} className="animate-in fade-in-50 duration-500">
        {currentStepIndex > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack} 
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 h-8 sm:h-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> 
            <span className="text-xs sm:text-sm">Voltar</span>
          </Button>
        )}
        
        {currentStep === "name" && (
          <CardContent className="relative px-4 pt-10 text-center sm:px-6 sm:pt-12">
            <div className="absolute left-1/2 -top-2 -translate-x-1/2 sm:left-auto sm:right-8 sm:top-0 sm:translate-x-0">
              {!isProcessing && (
                <div className="max-w-[240px] text-center sm:text-right">
                  {loadingLimit ? (
                    <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Carregando gerações...</span>
                    </div>
                  ) : limitInfo ? (
                    <GenerationLimitAlert
                      limitInfo={limitInfo}
                      variant="inline"
                    />
                  ) : null}
                </div>
              )}
            </div>
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FACC15]/10 mb-3 sm:mb-4 dark:bg-[#FACC15]/8">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-[#FACC15]" />
            </div>
            <CardTitle className="text-xl sm:text-2xl tracking-tight">Vamos começar!</CardTitle>
            <CardDescription className="mt-2 text-sm sm:text-base px-2 text-muted-foreground/90">
              Dê um nome para o seu novo deck de estudos.
            </CardDescription>
            <Input 
              id="set-name" 
              placeholder="Ex: Biologia - Fotossíntese" 
              value={data.name} 
              onChange={(e) => setData({ ...data, name: e.target.value })} 
              className="mt-4 sm:mt-6 max-w-sm mx-auto text-center text-base sm:text-lg h-11 sm:h-12 border-border/60 dark:border-zinc-700/70"
            />
            <Button 
              onClick={handleNext} 
              className="w-full max-w-sm mt-3 sm:mt-4 h-10 sm:h-11" 
              disabled={!data.name.trim()}
            >
              Próximo
            </Button>
          </CardContent>
        )}
        
        {currentStep === "content" && (
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <CardTitle className="text-center text-xl sm:text-2xl mt-8 sm:mt-0 tracking-tight">
              Forneça o Conteúdo
            </CardTitle>
            <CardDescription className="text-center mt-2 text-sm sm:text-base px-2 text-muted-foreground/90">
              Escolha como inserir o seu material de estudo.
            </CardDescription>
             <Tabs 
               value={data.inputType} 
               onValueChange={(value) => {
                 setData({
                   ...data,
                   inputType: value as 'text' | 'upload',
                   file: value === 'text' ? null : data.file,
                   text: value === 'upload' ? data.text : data.text,
                 });
                 setFileError(null); 
                 if (value === 'text') {
                   resetPdfSelectionState();
                 }
               }} 
               className="w-full mt-4 sm:mt-6"
             >
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  <TabsTrigger value="text" className="gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
                    <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Digitar </span>Texto
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
                    <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Upload<span className="hidden xs:inline"> de Arquivo</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="text" className="mt-3 sm:mt-4">
                    <Textarea 
                      id="content" 
                      placeholder="Cole aqui o tópico, texto ou resumo do seu material de estudo..." 
                      className="min-h-[200px] sm:min-h-[250px] mt-2 text-sm sm:text-base" 
                      value={data.text} 
                      onChange={(e) => {
                        setData({ ...data, text: e.target.value, file: null });
                        setFileError(null); 
                      }} 
                    />
                </TabsContent>
                
                <TabsContent value="upload" className="mt-3 sm:mt-4">
                  <label 
                    htmlFor="file-upload" 
                    className={cn(
                      "mt-2 border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all cursor-pointer block",
                      fileError 
                        ? "border-red-500/50 bg-red-500/5 text-red-600"
                        : "text-muted-foreground hover:border-primary hover:bg-accent"
                    )}
                  >
                    {!data.file && !fileError && <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4" />}
                    {fileError && <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4" />}
                    {data.file && !fileError && !isInspectingPdf && <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />}
                    {isInspectingPdf && <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4 animate-spin" />}
                    
                    <p className="text-xs sm:text-sm px-2">
                      {isInspectingPdf ? (
                        <span className="font-medium text-foreground break-all">
                          Analisando páginas do PDF...
                        </span>
                      ) : data.file && !fileError ? (
                        <span className="font-medium text-foreground break-all">✓ {data.file.name}</span>
                      ) : fileError ? (
                        <span className="font-medium">{fileError}</span>
                      ) : (
                        <>
                          <span className="block sm:inline">Clique ou arraste para enviar</span>
                          <span className="block sm:inline text-xs mt-1 sm:mt-0 sm:ml-1">
                            ({ACCEPTED_FILE_TYPES_STRING})
                          </span>
                        </>
                      )}
                    </p>
                    <Input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept={ACCEPTED_FILE_TYPES_STRING}
                      onChange={handleFileChange} 
                    />
                  </label>
                </TabsContent>
              </Tabs>
            <Button 
              onClick={() => {
                if (isPdfUpload) {
                  setCurrentStep("pdf-pages");
                  return;
                }
                setCurrentStep("customize");
              }} 
              className="w-full mt-4 sm:mt-6 h-10 sm:h-11" 
              disabled={
                fileError ? true :
                isInspectingPdf ? true :
                (isPdfUpload && !pdfInspectInfo) ? true :
                (data.inputType === 'text' && !data.text.trim()) || 
                (data.inputType === 'upload' && !data.file)
              }
            >
              Próximo
            </Button>
          </CardContent>
        )}

        {currentStep === "pdf-pages" && (
          <CardContent className="pt-8 pb-6 px-4 sm:px-6 space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#48cfea]/10 mb-3 sm:mb-4 dark:bg-[#48cfea]/8">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-[#48cfea]" />
              </div>
              <CardTitle className="text-xl sm:text-2xl tracking-tight">Escolha as páginas do PDF</CardTitle>
              <CardDescription className="mt-2 text-sm sm:text-base px-2 text-muted-foreground/90">
                Use todas as páginas ou informe um filtro como <span className="font-medium text-foreground/80">1,2,5-8</span>.
              </CardDescription>
            </div>

            {data.file && pdfInspectInfo && (
              <PdfPagePicker
                file={data.file}
                fileName={pdfInspectInfo.file_name || data.file.name}
                totalPages={pdfInspectInfo.total_pages}
                pages={pdfInspectInfo.pages}
                selectedPages={selectedPdfPages}
                onSelectedPagesChange={applyPdfPageSelection}
              />
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={useAllPdfPages ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  setUseAllPdfPages(true);
                  setPageSelection("");
                  setPageSelectionError(null);
                }}
              >
                Usar todas
              </Button>
              <Button
                type="button"
                variant={!useAllPdfPages ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  setUseAllPdfPages(false);
                  if (!pageSelection.trim() && totalPdfPages > 0) {
                    setPageSelection("1");
                  }
                }}
              >
                Escolher páginas
              </Button>
            </div>

            {!useAllPdfPages && (
              <div className="space-y-2">
                <Label htmlFor="page-selection-input">Filtro de páginas</Label>
                <Input
                  id="page-selection-input"
                  placeholder="Ex: 1,2,5-8"
                  value={pageSelection}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUseAllPdfPages(false);
                    setPageSelection(value);
                    setPageSelectionError(
                      validatePdfPageSelection(value, totalPdfPages)
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Exemplos válidos: 1,2,3 • 1-5 • 2,4,7-9
                </p>
                {pageSelectionError && (
                  <p className="text-xs text-red-600">{pageSelectionError}</p>
                )}
              </div>
            )}

            <Button
              onClick={() => {
                if (!useAllPdfPages) {
                  const validationError = validatePdfPageSelection(
                    pageSelection,
                    totalPdfPages,
                  );
                  setPageSelectionError(validationError);
                  if (validationError) {
                    return;
                  }
                }
                setCurrentStep("customize");
              }}
              className="w-full h-10 sm:h-11"
            >
              Próximo
            </Button>
          </CardContent>
        )}

        {currentStep === "customize" && (
          <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 sm:px-6 space-y-5 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/70 mb-3 sm:mb-4 dark:bg-zinc-800/60">
                      <Settings2 className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground/80" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl tracking-tight">Customize a Geração</CardTitle>
                    <CardDescription className="mt-2 text-sm sm:text-base px-2 text-muted-foreground/90">
                      Ajuste as opções de IA para o seu material.
                    </CardDescription>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/50 bg-card px-4 py-4 dark:border-zinc-800/60 dark:bg-background/40">
                  <Label className="text-sm sm:text-base font-semibold">O que deseja criar?</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Cada formato usa uma leitura diferente do mesmo conteúdo. Escolha um só ou saia com o pacote completo.
                  </p>
                  <ToggleGroup
                      type="single" value={data.contentType}
                      onValueChange={(value: WizardData['contentType']) => value && setData({ ...data, contentType: value })}
                      className="w-full grid grid-cols-3 gap-2 sm:gap-2.5"
                  >
                      <ToggleGroupItem 
                        value="flashcards" 
                        className={cn(
                          "flex-col h-auto min-h-[80px] gap-2.5 py-3.5 sm:min-h-[88px] sm:py-4 text-xs sm:text-sm border rounded-xl transition-all duration-200",
                          data.contentType === "flashcards"
                            ? CREATE_MODE_STYLES.flashcards
                            : CREATE_MODE_BASE_STYLES.flashcards
                        )}
                      >
                        <Layers className="w-5 h-5" />
                        <span>Flashcards</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="quiz" 
                        className={cn(
                          "flex-col h-auto min-h-[80px] gap-2.5 py-3.5 sm:min-h-[88px] sm:py-4 text-xs sm:text-sm border rounded-xl transition-all duration-200",
                          data.contentType === "quiz"
                            ? CREATE_MODE_STYLES.quiz
                            : CREATE_MODE_BASE_STYLES.quiz
                        )}
                      >
                        <BrainCircuit className="w-5 h-5" />
                        <span>Quizzes</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="both" 
                        className={cn(
                          "flex-col h-auto min-h-[80px] gap-1.5 py-3.5 sm:min-h-[88px] sm:py-4 text-xs sm:text-sm border rounded-xl transition-all duration-200",
                          data.contentType === "both"
                            ? CREATE_MODE_STYLES.both
                            : CREATE_MODE_BASE_STYLES.both
                        )}
                      >
                        <Combine className="w-5 h-5" />
                        <span>Ambos</span>
                        <span className={cn(
                          "text-[10px] uppercase tracking-[0.14em]",
                          data.contentType === "both"
                            ? "text-black/70"
                            : "text-[#2f8a57] dark:text-[#a5edbd]"
                        )}>
                          + guiado
                        </span>
                      </ToggleGroupItem>
                  </ToggleGroup>
                  {requestedGeneratesGuided && (
                    <div className="mt-1 rounded-xl border border-[#7FD9A0]/25 bg-gradient-to-r from-[#7FD9A0]/8 via-transparent to-[#7FD9A0]/5 px-4 py-3.5 dark:border-[#7FD9A0]/15 dark:from-[#7FD9A0]/6 dark:to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7FD9A0]/15 dark:bg-[#7FD9A0]/10">
                          <Map className="h-4 w-4 text-[#7FD9A0]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            Trilha guiada inclusa
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            Flashcards e quiz combinados em uma trilha de estudo sequencial.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(data.contentType === 'flashcards' || data.contentType === 'both') && (
                  <div className={cn(
                    "animate-in fade-in-20 duration-300 space-y-2.5 sm:space-y-3 rounded-2xl border px-4 py-4",
                    OUTPUT_THEMES.flashcards.border,
                    "bg-[#FACC15]/10 dark:bg-[#FACC15]/8"
                  )}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="num-flashcards" className={cn("text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2", OUTPUT_THEMES.flashcards.text)}>
                          <Layers className={cn("w-4 h-4 sm:w-5 sm:h-5", OUTPUT_THEMES.flashcards.text)} />
                          <span className="text-xs sm:text-base">Número de Flashcards</span>
                        </Label>
                        <span className={cn("text-base sm:text-lg font-bold", OUTPUT_THEMES.flashcards.text)}>{data.num_flashcards}</span>
                      </div>
                      <Slider 
                        id="num-flashcards" 
                        min={5} 
                        max={20}
                        step={1} 
                        value={[data.num_flashcards]} 
                        onValueChange={(v) => setData({ ...data, num_flashcards: v[0] })}
                        className={cn("mt-2", CONTENT_SLIDER_STYLES.flashcards)}
                      />
                      <div className={cn("flex justify-between text-[10px] sm:text-xs", OUTPUT_THEMES.flashcards.softText)}>
                        <span>Mínimo: 5</span>
                        <span>Máximo: 20</span>
                      </div>
                  </div>
                )}

                {(data.contentType === 'quiz' || data.contentType === 'both') && (
                  <div className={cn(
                    "animate-in fade-in-20 duration-300 space-y-2.5 sm:space-y-3 rounded-2xl border px-4 py-4",
                    OUTPUT_THEMES.quiz.border,
                    "bg-[#48cfea]/10 dark:bg-[#48cfea]/8"
                  )}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="num-questions" className={cn("text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2", OUTPUT_THEMES.quiz.text)}>
                          <BrainCircuit className={cn("w-4 h-4 sm:w-5 sm:h-5", OUTPUT_THEMES.quiz.text)} />
                          <span className="text-xs sm:text-base">Perguntas do Quiz</span>
                        </Label>
                        <span className={cn("text-base sm:text-lg font-bold", OUTPUT_THEMES.quiz.text)}>{data.num_questions}</span>
                      </div>
                      <Slider 
                        id="num-questions" 
                        min={3} 
                        max={15}
                        step={1} 
                        value={[data.num_questions]} 
                        onValueChange={(v) => setData({ ...data, num_questions: v[0] })}
                        className={cn("mt-2", CONTENT_SLIDER_STYLES.quiz)}
                      />
                      <div className={cn("flex justify-between text-[10px] sm:text-xs", OUTPUT_THEMES.quiz.softText)}>
                        <span>Mínimo: 3</span>
                        <span>Máximo: 15</span>
                      </div>
                  </div>
                )}

                <div className="space-y-3 rounded-2xl border border-border/50 bg-card px-4 py-4 dark:border-zinc-800/60">
                  <Label className="text-sm sm:text-base font-semibold">Nível de Dificuldade</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Define o quanto a IA pode aumentar a complexidade conceitual das perguntas e respostas.
                  </p>
                  <ToggleGroup
                      type="single" value={data.difficulty}
                      onValueChange={(value: string) => value && setData({ ...data, difficulty: value })}
                      className="w-full grid grid-cols-3 gap-1.5 sm:gap-2"
                  >
                      <ToggleGroupItem 
                        value="Fácil" 
                        className={cn(
                          "flex-col h-auto gap-1.5 py-3 sm:py-3.5 text-xs sm:text-sm border border-gray-200 rounded-xl bg-background/70 text-muted-foreground transition-all duration-200 hover:bg-muted/40 dark:border-zinc-700/60 dark:bg-background/60 dark:hover:bg-muted/30",
                          DIFFICULTY_STYLES.easy
                        )}
                      >
                        <Sprout className="w-4 h-4" />
                        <span>Fácil</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="Médio" 
                        className={cn(
                          "flex-col h-auto gap-1.5 py-3 sm:py-3.5 text-xs sm:text-sm border border-gray-200 rounded-xl bg-background/70 text-muted-foreground transition-all duration-200 hover:bg-muted/40 dark:border-zinc-700/60 dark:bg-background/60 dark:hover:bg-muted/30",
                          DIFFICULTY_STYLES.medium
                        )}
                      >
                        <Leaf className="w-4 h-4" />
                        <span>Médio</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="Difícil" 
                        className={cn(
                          "flex-col h-auto gap-1.5 py-3 sm:py-3.5 text-xs sm:text-sm border border-gray-200 rounded-xl bg-background/70 text-muted-foreground transition-all duration-200 hover:bg-muted/40 dark:border-zinc-700/60 dark:bg-background/60 dark:hover:bg-muted/30",
                          DIFFICULTY_STYLES.hard
                        )}
                      >
                        <Trees className="w-4 h-4" />
                        <span>Difícil</span>
                      </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button 
                  onClick={() => setCurrentStep("review")} 
                  className="w-full !mt-6 sm:!mt-8 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-sm" 
                  disabled={isSubmitting || isProcessing || ((limitInfo?.remaining ?? 0) < requestedGenerationUnits)}
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Revisar geração
                </Button>
            </CardContent>
        )}

        {currentStep === "review" && (
          <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 sm:px-6 space-y-5 sm:space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#7FD9A0]/10 mb-3 sm:mb-4 dark:bg-[#7FD9A0]/8">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#7FD9A0]" />
              </div>
              <CardTitle className="text-xl sm:text-2xl tracking-tight">Revise sua geração</CardTitle>
              <CardDescription className="mt-2 text-sm sm:text-base px-2 text-muted-foreground/90">
                Confira o pacote que vai ser criado antes de iniciar o processamento.
              </CardDescription>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-card px-4 py-4 dark:border-zinc-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Resumo</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-muted/30 px-3 py-3 dark:border-zinc-700/60 dark:bg-white/[0.03]">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Deck</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{data.name}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-muted/30 px-3 py-3 dark:border-zinc-700/60 dark:bg-white/[0.03]">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Fonte</p>
                      <p className="mt-2 text-sm font-semibold text-foreground break-all">{sourceLabel}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-muted/30 px-3 py-3 dark:border-zinc-700/60 dark:bg-white/[0.03]">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Dificuldade</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{data.difficulty}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-muted/30 px-3 py-3 dark:border-zinc-700/60 dark:bg-white/[0.03]">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Gerações</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {requestedGenerationUnits} {requestedGenerationUnits === 1 ? "unidade" : "unidades"}
                      </p>
                    </div>
                    {pageSelectionLabel ? (
                      <div className="rounded-xl border border-gray-200 bg-muted/30 px-3 py-3 dark:border-zinc-700/60 sm:col-span-2 dark:bg-white/[0.03]">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Páginas do PDF</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{pageSelectionLabel}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card px-4 py-4 dark:border-zinc-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">Conteúdos gerados</p>
                  <div className="mt-3 space-y-3">
                    {outputSummary.map((item) => {
                      const theme = OUTPUT_THEMES[item.id];
                      const Icon = item.id === "flashcards" ? Layers : item.id === "quiz" ? BrainCircuit : Map;
                      return (
                        <div
                          key={item.id}
                          className={cn("rounded-xl border px-4 py-4", theme.border, theme.panel)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("rounded-xl p-2.5", theme.badge)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={cn("text-sm font-semibold", theme.text)}>{item.title}</p>
                              <p className={cn("mt-1 text-sm", theme.softText)}>{item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-card px-4 py-4 dark:border-zinc-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                    Próximas experiências
                  </p>
                  <div className="mt-3 space-y-3">
                    {requestedGeneratesFlashcards ? (
                      <div className={cn("rounded-xl border px-4 py-4", OUTPUT_THEMES.flashcards.border, OUTPUT_THEMES.flashcards.panel)}>
                        <p className={cn("text-sm font-semibold", OUTPUT_THEMES.flashcards.text)}>Flashcards prontos para estudar</p>
                        <p className={cn("mt-1 text-sm", OUTPUT_THEMES.flashcards.softText)}>
                          O deck já sai preparado para revisão imediata e ciclos de repetição.
                        </p>
                      </div>
                    ) : null}
                    {requestedGeneratesQuizzes ? (
                      <div className={cn("rounded-xl border px-4 py-4", OUTPUT_THEMES.quiz.border, OUTPUT_THEMES.quiz.panel)}>
                        <p className={cn("text-sm font-semibold", OUTPUT_THEMES.quiz.text)}>Quiz pronto para validar desempenho</p>
                        <p className={cn("mt-1 text-sm", OUTPUT_THEMES.quiz.softText)}>
                          As perguntas já chegam organizadas para prática e revisão futura.
                        </p>
                      </div>
                    ) : null}
                    {requestedGeneratesGuided ? (
                      <div className={cn("rounded-xl border px-4 py-4", OUTPUT_THEMES.guided.border, OUTPUT_THEMES.guided.panel)}>
                        <p className={cn("text-sm font-semibold", OUTPUT_THEMES.guided.text)}>Estudo guiado incluso no pacote</p>
                        <p className={cn("mt-1 text-sm", OUTPUT_THEMES.guided.softText)}>
                          A trilha será montada no mesmo processamento para conectar revisão e validação.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-muted/20 px-4 py-4 dark:border-zinc-700/60 dark:bg-white/[0.03]">
                        <p className="text-sm font-semibold text-foreground">Você pode expandir depois</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Se quiser, o restante do pacote continua disponível no dashboard do deck depois.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-4 dark:border-zinc-800/60 dark:bg-background/60">
                  <p className="text-sm font-semibold text-foreground">Antes de gerar</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Revise se as quantidades e o formato escolhido representam bem o material que você enviou.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-sm" 
              disabled={isSubmitting || isProcessing || ((limitInfo?.remaining ?? 0) < requestedGenerationUnits)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Gerar conteúdo
                </>
              )}
            </Button>
          </CardContent>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
          <div className="mb-3 sm:mb-4">
              <Link 
                href="/library" 
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-200"
              >
                <ArrowLeft className="w-3 h-3" />
                Biblioteca
              </Link>
          </div>

          {!isProcessing && <WizardProgress/>}
          <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm dark:border-zinc-800/80 dark:shadow-none">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(250,204,21,0.6),rgba(72,207,234,0.55),transparent)]" />
            {renderStepContent()}
          </Card>
      </div>

      {/* Dialog de Limite Atingido */}
      {limitDialogInfo && (
        <LimitReachedDialog
          isOpen={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
          limitInfo={limitDialogInfo}
        />
      )}
    </>
  );
}
