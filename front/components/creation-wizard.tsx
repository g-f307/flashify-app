"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient, Document } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FlashcardLoader from "@/components/flashcard-loader";
import { 
  Loader2, 
  ArrowLeft, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  ListOrdered
} from "lucide-react";
import Link from "next/link";

type WizardData = {
  name: string;
  inputType: "text" | "upload";
  text: string;
  file: File | null;
  num_flashcards: number;
};

interface CreationWizardProps {
  onCreationSuccess: () => void;
}

const steps = [
  { id: 1, name: "Nome", icon: Sparkles },
  { id: 2, name: "Conteúdo", icon: FileText },
  { id: 3, name: "Quantidade", icon: ListOrdered },
];

export function CreationWizard({ onCreationSuccess }: CreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocument, setProcessingDocument] = useState<Document | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [data, setData] = useState<WizardData>({
    name: "",
    inputType: "text",
    text: "",
    file: null,
    num_flashcards: 10,
  });

  const handleNext = () => setStep((s) => Math.min(s + 1, 3));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const monitorProcessing = async (documentId: number) => {
    try {
      const document = await apiClient.getDocument(documentId);
      setProcessingDocument(document);
      setProcessingProgress(document.processing_progress || 0);

      if (document.status === 'COMPLETED') {
        try {
          const flashcards = await apiClient.getDocumentFlashcards(documentId);
          
          if (flashcards && flashcards.length > 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsProcessing(false);
            toast.success(`Deck "${data.name}" criado com sucesso!`, {
              description: `${flashcards.length} flashcards foram gerados e estão prontos para estudo.`,
            });
            onCreationSuccess();
          }
        } catch (flashcardsError) {
          console.log('Erro ao buscar flashcards, continuando monitoramento:', flashcardsError);
        }
      } else if (document.status === 'FAILED') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsProcessing(false);
        toast.error("Falha ao processar o deck", {
          description: "Houve um erro durante o processamento. Tente novamente.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao monitorar processamento:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!data.name.trim()) return toast.error("Por favor, dê um nome ao seu deck.");
    if (data.inputType === 'text' && !data.text.trim()) return toast.error("O conteúdo de texto não pode estar vazio.");
    if (data.inputType === 'upload' && !data.file) return toast.error("Por favor, selecione um arquivo para upload.");

    setIsSubmitting(true);
    try {
      let document: Document;
      
      if (data.inputType === 'upload' && data.file) {
        document = await apiClient.uploadDocument(data.file, data.name, data.num_flashcards);
      } else {
        document = await apiClient.createDocumentFromText(data.text, data.name, data.num_flashcards);
      }

      setIsSubmitting(false);
      setIsProcessing(true);
      setProcessingDocument(document);
      setProcessingProgress(document.processing_progress || 0);

      intervalRef.current = setInterval(() => {
        monitorProcessing(document.id);
      }, 3000); 

      monitorProcessing(document.id);

    } catch (error: any) {
      setIsSubmitting(false);
      toast.error("Falha ao criar deck", { description: error.message || "Tente novamente mais tarde." });
    }
  };
  
  const WizardProgress = () => (
    <div className="flex items-center justify-center gap-2 sm:gap-4 p-4">
        {steps.map((s, index) => (
            <div key={s.id} className="flex items-center gap-2">
                <div
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        step > s.id ? "bg-primary text-primary-foreground" :
                        step === s.id ? "bg-primary/20 border-2 border-primary text-primary" :
                        "bg-muted text-muted-foreground"
                    )}
                >
                    <s.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                    "font-medium hidden sm:inline",
                    step === s.id ? "text-primary" : "text-muted-foreground"
                )}>
                    {s.name}
                </span>
                {index < steps.length - 1 && (
                    <div className={cn(
                        "h-0.5 w-8 sm:w-12 transition-all",
                        step > s.id ? "bg-primary" : "bg-muted"
                    )}/>
                )}
            </div>
        ))}
    </div>
  );

  const renderStepContent = () => {
    // ▼▼▼ ALTERAÇÃO PRINCIPAL AQUI ▼▼▼
    if (isProcessing) {
      return (
        <div className="animate-in fade-in-50 duration-500">
          <CardContent className="flex justify-center items-center py-12">
            {/* O novo componente de carregamento recebe o status real do documento */}
            <FlashcardLoader currentStepMessage={processingDocument?.current_step} />
          </CardContent>
        </div>
      );
    }
    // ▲▲▲ FIM DA ALTERAÇÃO PRINCIPAL ▲▲▲

    return (
      <div key={step} className="animate-in fade-in-50 duration-500">
        {step > 1 && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="absolute top-4 left-4 z-10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
        )}
        {step === 1 && (
          <CardContent className="text-center pt-12">
            <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Vamos começar!</CardTitle>
            <CardDescription className="mt-2">Dê um nome para o seu novo deck de estudos.</CardDescription>
            <Input
              id="set-name"
              placeholder="Ex: Biologia - Fotossíntese"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="mt-6 max-w-sm mx-auto text-center text-lg"
            />
            <Button onClick={handleNext} className="w-full max-w-sm mt-4" disabled={!data.name.trim()}>Próximo</Button>
          </CardContent>
        )}
        {step === 2 && (
          <CardContent>
            <CardTitle className="text-center">Forneça o Conteúdo</CardTitle>
            <CardDescription className="text-center mt-2">Escolha como inserir o seu material de estudo.</CardDescription>
             <Tabs value={data.inputType} onValueChange={(value) => setData({...data, inputType: value as 'text' | 'upload'})} className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Digitar Texto</TabsTrigger>
                  <TabsTrigger value="upload">Upload de Ficheiro</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4">
                    <Textarea
                        id="content"
                        placeholder="Cole aqui o texto..."
                        className="min-h-[250px] mt-2"
                        value={data.text}
                        onChange={(e) => setData({ ...data, text: e.target.value, file: null })}
                    />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <label htmlFor="file-upload" className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer block">
                    <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">{data.file ? data.file.name : "Clique ou arraste para enviar (PDF, JPG, PNG)"}</p>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setData({ ...data, file: e.target.files ? e.target.files[0] : null, text: "" })}
                    />
                  </label>
                </TabsContent>
              </Tabs>
            <Button onClick={handleNext} className="w-full mt-6" disabled={(data.inputType === 'text' && !data.text.trim()) || (data.inputType === 'upload' && !data.file)}>Próximo</Button>
          </CardContent>
        )}
        {step === 3 && (
            <CardContent className="text-center pt-12">
                <ListOrdered className="w-12 h-12 mx-auto text-primary mb-4" />
                <CardTitle>Quantidade de Flashcards</CardTitle>
                <CardDescription className="mt-2">Escolha quantos flashcards quer gerar.</CardDescription>
                <div className="my-8">
                    <span className="font-bold text-5xl text-primary">{data.num_flashcards}</span>
                </div>
                <Slider
                    defaultValue={[data.num_flashcards]}
                    max={20}
                    min={1}
                    step={1}
                    onValueChange={(value) => setData({ ...data, num_flashcards: value[0] })}
                    className="max-w-sm mx-auto"
                />
                <Button onClick={handleSubmit} className="w-full max-w-sm mt-8" disabled={isSubmitting || isProcessing}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando deck...
                      </div>
                    ) : (
                      "Gerar Flashcards!"
                    )}
                </Button>
            </CardContent>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
            <Link href="/library" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para a Biblioteca
            </Link>
        </div>
        
        {!isProcessing && <WizardProgress/>}
        <Card className="relative overflow-hidden">
            {renderStepContent()}
        </Card>
    </div>
  )
}