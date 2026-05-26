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
} from "lucide-react";
import Link from "next/link";

type WizardStepId = "name" | "content" | "pdf-pages" | "customize";

type WizardData = {
  name: string;
  inputType: "text" | "upload";
  text: string;
  file: File | null;
  contentType: "flashcards" | "quiz" | "both";
  num_flashcards: number;
  difficulty: string;
  num_questions: number;
};

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
  });

  const requestedGeneratesFlashcards =
    data.contentType === "flashcards" || data.contentType === "both";
  const requestedGeneratesQuizzes =
    data.contentType === "quiz" || data.contentType === "both";
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
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

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
    <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 p-3 sm:p-4 overflow-x-auto">
        {steps.map((s, index) => (
            <div key={s.id} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                  index < currentStepIndex ? "bg-primary text-primary-foreground" : 
                  s.id === currentStep ? "bg-primary/20 border-2 border-primary text-primary" : 
                  "bg-muted text-muted-foreground"
                )}>
                    <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={cn(
                  "font-medium text-xs sm:text-sm hidden sm:inline transition-colors whitespace-nowrap",
                  s.id === currentStep ? "text-primary" : "text-muted-foreground"
                )}>
                  {s.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-4 sm:w-8 md:w-12 transition-all flex-shrink-0",
                    index < currentStepIndex ? "bg-primary" : "bg-muted"
                  )}/>
                )}
            </div>
        ))}
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
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 h-8 sm:h-9"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> 
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
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Vamos começar!</CardTitle>
            <CardDescription className="mt-2 text-sm sm:text-base px-2">
              Dê um nome para o seu novo deck de estudos.
            </CardDescription>
            <Input 
              id="set-name" 
              placeholder="Ex: Biologia - Fotossíntese" 
              value={data.name} 
              onChange={(e) => setData({ ...data, name: e.target.value })} 
              className="mt-4 sm:mt-6 max-w-sm mx-auto text-center text-base sm:text-lg h-11 sm:h-12"
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
            <CardTitle className="text-center text-xl sm:text-2xl mt-8 sm:mt-0">
              Forneça o Conteúdo
            </CardTitle>
            <CardDescription className="text-center mt-2 text-sm sm:text-base px-2">
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
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
                <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Escolha as páginas do PDF</CardTitle>
              <CardDescription className="mt-2 text-sm sm:text-base px-2">
                Use todas as páginas ou informe um filtro como <span className="font-medium">1,2,5-8</span>.
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
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 mb-3 sm:mb-4">
                      <Settings2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">Customize a Geração</CardTitle>
                    <CardDescription className="mt-2 text-sm sm:text-base px-2">
                      Ajuste as opções de IA para o seu material.
                    </CardDescription>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-semibold">O que deseja criar?</Label>
                  <ToggleGroup
                      type="single" value={data.contentType}
                      onValueChange={(value: WizardData['contentType']) => value && setData({ ...data, contentType: value })}
                      className="w-full grid grid-cols-3 gap-1.5 sm:gap-2"
                  >
                      <ToggleGroupItem 
                        value="flashcards" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <Layers className="w-4 h-4" />
                        <span className="leading-tight">Flash-<br className="sm:hidden"/>cards</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="quiz" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>Quiz</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="both" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <Combine className="w-4 h-4" />
                        <span>Ambos</span>
                      </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {(data.contentType === 'flashcards' || data.contentType === 'both') && (
                  <div className="animate-in fade-in-20 duration-300 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="num-flashcards" className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
                          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70" />
                          <span className="text-xs sm:text-base">Número de Flashcards</span>
                        </Label>
                        <span className="text-base sm:text-lg font-bold text-primary">{data.num_flashcards}</span>
                      </div>
                      <Slider 
                        id="num-flashcards" 
                        min={5} 
                        max={20}
                        step={1} 
                        value={[data.num_flashcards]} 
                        onValueChange={(v) => setData({ ...data, num_flashcards: v[0] })}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                        <span>Mínimo: 5</span>
                        <span>Máximo: 20</span>
                      </div>
                  </div>
                )}

                {(data.contentType === 'quiz' || data.contentType === 'both') && (
                  <div className="animate-in fade-in-20 duration-300 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="num-questions" className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
                          <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-primary/70" />
                          <span className="text-xs sm:text-base">Perguntas do Quiz</span>
                        </Label>
                        <span className="text-base sm:text-lg font-bold text-primary">{data.num_questions}</span>
                      </div>
                      <Slider 
                        id="num-questions" 
                        min={3} 
                        max={15}
                        step={1} 
                        value={[data.num_questions]} 
                        onValueChange={(v) => setData({ ...data, num_questions: v[0] })}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                        <span>Mínimo: 3</span>
                        <span>Máximo: 15</span>
                      </div>
                  </div>
                )}

                <div className="space-y-2.5 sm:space-y-3">
                  <Label className="text-sm sm:text-base font-semibold">Nível de Dificuldade</Label>
                  <ToggleGroup
                      type="single" value={data.difficulty}
                      onValueChange={(value: string) => value && setData({ ...data, difficulty: value })}
                      className="w-full grid grid-cols-3 gap-1.5 sm:gap-2"
                  >
                      <ToggleGroupItem 
                        value="Fácil" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <Sprout className="w-4 h-4" />
                        <span>Fácil</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="Médio" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <Leaf className="w-4 h-4" />
                        <span>Médio</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="Difícil" 
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-col h-auto gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm"
                      >
                        <Trees className="w-4 h-4" />
                        <span>Difícil</span>
                      </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full !mt-6 sm:!mt-8 h-11 sm:h-12 text-sm sm:text-base font-semibold" 
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
                        Gerar Conteúdo
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <Link 
                href="/library" 
                className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Voltar para a Biblioteca
              </Link>
          </div>

          {!isProcessing && <WizardProgress/>}
          <Card className="relative overflow-hidden">{renderStepContent()}</Card>
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
