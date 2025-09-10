"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient, Document } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ListOrdered, 
  BrainCircuit,
  Smile,
  Meh,
  CheckCircle
} from "lucide-react";

type WizardData = {
  name: string;
  inputType: "text" | "upload";
  text: string;
  file: File | null;
  num_flashcards: number;
  difficulty: "Fácil" | "Médio" | "Difícil";
};

interface CreationWizardProps {
  onCreationSuccess: () => void;
}

const steps = [
  { id: 1, name: "Nome", icon: Sparkles },
  { id: 2, name: "Conteúdo", icon: FileText },
  { id: 3, name: "Quantidade", icon: ListOrdered },
  { id: 4, name: "Dificuldade", icon: BrainCircuit },
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
    difficulty: "Médio",
  });

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  // Função para monitorar o progresso do processamento
  const monitorProcessing = async (documentId: number) => {
    try {
      const document = await apiClient.getDocument(documentId);
      setProcessingDocument(document);
      setProcessingProgress(document.processing_progress || 0);

      if (document.status === 'COMPLETED') {
        // Verifica se os flashcards realmente existem antes de redirecionar
        try {
          const flashcards = await apiClient.getDocumentFlashcards(documentId);
          
          if (flashcards && flashcards.length > 0) {
            // Flashcards realmente existem - pode redirecionar
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsProcessing(false);
            toast.success(`Conjunto "${data.name}" criado com sucesso!`, {
              description: `${flashcards.length} flashcards foram gerados e estão prontos para estudo.`,
            });
            onCreationSuccess();
          } else {
            // Status é COMPLETED mas não há flashcards - continua aguardando
            console.log('Documento marcado como COMPLETED mas sem flashcards. Continuando monitoramento...');
          }
        } catch (flashcardsError) {
          // Erro ao buscar flashcards - continua aguardando
          console.log('Erro ao buscar flashcards, continuando monitoramento:', flashcardsError);
        }
      } else if (document.status === 'FAILED') {
        // Processamento falhou
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsProcessing(false);
        toast.error("Falha ao processar o conjunto", {
          description: "Houve um erro durante o processamento. Tente novamente.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao monitorar processamento:', error);
    }
  };

  // Cleanup do interval quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!data.name.trim()) return toast.error("Por favor, dê um nome ao seu conjunto.");
    if (data.inputType === 'text' && !data.text.trim()) return toast.error("O conteúdo de texto não pode estar vazio.");
    if (data.inputType === 'upload' && !data.file) return toast.error("Por favor, selecione um arquivo para upload.");

    setIsSubmitting(true);
    try {
      let document: Document;
      
      if (data.inputType === 'upload' && data.file) {
        document = await apiClient.uploadDocument(data.file, data.name, data.num_flashcards, data.difficulty);
      } else {
        document = await apiClient.createDocumentFromText(data.text, data.name, data.num_flashcards, data.difficulty);
      }

      // Inicia o monitoramento do processamento
      setIsSubmitting(false);
      setIsProcessing(true);
      setProcessingDocument(document);
      setProcessingProgress(document.processing_progress || 0);

      // Inicia o polling para monitorar o progresso
      intervalRef.current = setInterval(() => {
        monitorProcessing(document.id);
      }, 3000); // Verifica a cada 3 segundos

      // Primeira verificação imediata
      monitorProcessing(document.id);

    } catch (error: any) {
      setIsSubmitting(false);
      toast.error("Falha ao criar conjunto", { description: error.message || "Tente novamente mais tarde." });
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
    if (isProcessing) {
      return (
        <div className="animate-in fade-in-50 duration-500">
          <CardContent className="text-center py-16">
            <div className="flex flex-col items-center space-y-6">
              <FlashcardLoader progress={processingProgress} />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Criando seus flashcards...
                </h3>
                <p className="text-muted-foreground">
                  {processingDocument?.status === 'COMPLETED' 
                    ? "Finalizando criação dos flashcards..." 
                    : (processingDocument?.current_step || "Processando conteúdo")
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Isso pode levar alguns minutos. Não feche esta página.
                </p>
              </div>
              {processingProgress === 100 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Gerando flashcards...</span>
                </div>
              )}
            </div>
          </CardContent>
        </div>
      );
    }

    // Usar key={step} força o React a remontar o componente, permitindo animações simples de entrada
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
            <CardDescription className="mt-2">Dê um nome para o seu novo conjunto de estudos.</CardDescription>
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
            <CardDescription className="text-center mt-2">Escolha como inserir seu material de estudo.</CardDescription>
             <Tabs value={data.inputType} onValueChange={(value) => setData({...data, inputType: value as 'text' | 'upload'})} className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Digitar Texto</TabsTrigger>
                  <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
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
                <CardDescription className="mt-2">Escolha quantos flashcards você quer gerar.</CardDescription>
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
                <Button onClick={handleNext} className="w-full max-w-sm mt-8">Próximo</Button>
            </CardContent>
        )}
         {step === 4 && (
            <CardContent className="text-center pt-12">
                 <BrainCircuit className="w-12 h-12 mx-auto text-primary mb-4" />
                <CardTitle>Nível de Dificuldade</CardTitle>
                <CardDescription className="mt-2">Selecione a complexidade dos flashcards que serão gerados.</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <Card onClick={() => setData({ ...data, difficulty: "Fácil" })} className={cn("cursor-pointer transition-all", data.difficulty === "Fácil" ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")}>
                        <CardHeader><Smile className="mx-auto w-8 h-8 text-green-500 mb-2" /><CardTitle>Fácil</CardTitle><CardDescription>Conceitos chave e definições.</CardDescription></CardHeader>
                    </Card>
                    <Card onClick={() => setData({ ...data, difficulty: "Médio" })} className={cn("cursor-pointer transition-all", data.difficulty === "Médio" ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")}>
                         <CardHeader><Meh className="mx-auto w-8 h-8 text-yellow-500 mb-2" /><CardTitle>Médio</CardTitle><CardDescription>Perguntas com exemplos e contexto.</CardDescription></CardHeader>
                    </Card>
                    <Card onClick={() => setData({ ...data, difficulty: "Difícil" })} className={cn("cursor-pointer transition-all", data.difficulty === "Difícil" ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")}>
                         <CardHeader><BrainCircuit className="mx-auto w-8 h-8 text-red-500 mb-2" /><CardTitle>Difícil</CardTitle><CardDescription>Questões complexas e cenários.</CardDescription></CardHeader>
                    </Card>
                </div>
                <Button onClick={handleSubmit} className="w-full max-w-sm mt-8" disabled={isSubmitting || isProcessing}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando conjunto...
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
    <div className="w-full max-w-3xl mx-auto">
        {!isProcessing && <WizardProgress/>}
        <Card className="relative overflow-hidden">
            {renderStepContent()}
        </Card>
    </div>
  )
}