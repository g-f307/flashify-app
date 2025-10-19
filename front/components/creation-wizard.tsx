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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ContentLoader from "@/components/content-loader"; 
import {
  Loader2,
  ArrowLeft,
  UploadCloud,
  FileText,
  Sparkles,
  Settings2,
} from "lucide-react";
import Link from "next/link";

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

interface CreationWizardProps {
  onCreationSuccess: () => void;
  folderId?: number;
}

const steps = [
  { id: 1, name: "Nome", icon: Sparkles },
  { id: 2, name: "Conteúdo", icon: FileText },
  { id: 3, name: "Customizar", icon: Settings2 },
];

export function CreationWizard({ onCreationSuccess, folderId }: CreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDocument, setProcessingDocument] = useState<Document | null>(null);
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

  const handleNext = () => setStep((s) => Math.min(s + 1, steps.length));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const monitorProcessing = async (documentId: number) => {
    try {
      const document = await apiClient.getDocument(documentId);
      setProcessingDocument(document);

      if (document.status === 'COMPLETED') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsProcessing(false);
        const createdItems = [];
        if (data.contentType === 'flashcards' || data.contentType === 'both') {
            createdItems.push('Flashcards');
        }
        if (data.contentType === 'quiz' || data.contentType === 'both') {
            createdItems.push('Quiz');
        }
        toast.success(`Deck "${data.name}" processado!`, {
          description: `${createdItems.join(' e ')} foram gerados com sucesso.`,
        });
        onCreationSuccess();
      } else if (document.status === 'FAILED') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsProcessing(false);
        toast.error("Falha ao processar o deck", {
          description: document.current_step || "Houve um erro durante o processamento.",
        });
      }
    } catch (error: any) {
      console.error('Erro ao monitorar processamento:', error);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsProcessing(false);
      toast.error("Não foi possível verificar o estado do deck.");
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!data.name.trim()) return toast.error("Por favor, dê um nome ao seu deck.");
    if (data.inputType === 'text' && !data.text.trim()) return toast.error("O conteúdo de texto não pode estar vazio.");
    if (data.inputType === 'upload' && !data.file) return toast.error("Por favor, selecione um ficheiro para upload.");

    setIsSubmitting(true);
    try {
      let document: Document;
      
      const generates_flashcards = data.contentType === 'flashcards' || data.contentType === 'both';
      const generates_quizzes = data.contentType === 'quiz' || data.contentType === 'both';

      const baseParams = {
        title: data.name,
        folderId: folderId,
        num_flashcards: data.num_flashcards,
        difficulty: data.difficulty,
        num_questions: data.num_questions,
        contentType: data.contentType, 
        generates_flashcards,
        generates_quizzes,
      };

      if (data.inputType === 'upload' && data.file) {
        document = await apiClient.uploadDocument({ ...baseParams, file: data.file });
      } else {
        document = await apiClient.createDocumentFromText({ ...baseParams, text: data.text });
      }

      setIsSubmitting(false);
      setIsProcessing(true);
      setProcessingDocument(document);

      intervalRef.current = setInterval(() => monitorProcessing(document.id), 3000);
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
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", step > s.id ? "bg-primary text-primary-foreground" : step === s.id ? "bg-primary/20 border-2 border-primary text-primary" : "bg-muted text-muted-foreground")}>
                    <s.icon className="w-5 h-5" />
                </div>
                <span className={cn("font-medium hidden sm:inline", step === s.id ? "text-primary" : "text-muted-foreground")}>{s.name}</span>
                {index < steps.length - 1 && <div className={cn("h-0.5 w-8 sm:w-12 transition-all", step > s.id ? "bg-primary" : "bg-muted")}/>}
            </div>
        ))}
    </div>
  );

  const renderStepContent = () => {
    if (isProcessing) {
      return (
        <div className="animate-in fade-in-50 duration-500">
          <CardContent className="flex justify-center items-center py-12">
            {/* ▼▼▼ ALTERAÇÃO CRUCIAL AQUI ▼▼▼ */}
            <ContentLoader 
              currentStepMessage={processingDocument?.current_step}
              generatesFlashcards={processingDocument?.generates_flashcards ?? false}
              generatesQuizzes={processingDocument?.generates_quizzes ?? false}
            />
          </CardContent>
        </div>
      );
    }

    return (
      <div key={step} className="animate-in fade-in-50 duration-500">
        {step > 1 && <Button variant="ghost" size="sm" onClick={handleBack} className="absolute top-4 left-4 z-10"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>}
        {step === 1 && (
          <CardContent className="text-center pt-12">
            <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle>Vamos começar!</CardTitle>
            <CardDescription className="mt-2">Dê um nome para o seu novo deck de estudos.</CardDescription>
            <Input id="set-name" placeholder="Ex: Biologia - Fotossíntese" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="mt-6 max-w-sm mx-auto text-center text-lg" />
            <Button onClick={handleNext} className="w-full max-w-sm mt-4" disabled={!data.name.trim()}>Próximo</Button>
          </CardContent>
        )}
        {step === 2 && (
          <CardContent>
            <CardTitle className="text-center">Forneça o Conteúdo</CardTitle>
            <CardDescription className="text-center mt-2">Escolha como inserir o seu material de estudo.</CardDescription>
             <Tabs value={data.inputType} onValueChange={(value) => setData({...data, inputType: value as 'text' | 'upload'})} className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="text">Digitar Texto</TabsTrigger><TabsTrigger value="upload">Upload de Ficheiro</TabsTrigger></TabsList>
                <TabsContent value="text" className="mt-4">
                    <Textarea id="content" placeholder="Cole aqui o texto..." className="min-h-[250px] mt-2" value={data.text} onChange={(e) => setData({ ...data, text: e.target.value, file: null })} />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <label htmlFor="file-upload" className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer block">
                    <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">{data.file ? data.file.name : "Clique ou arraste para enviar (PDF, JPG, PNG)"}</p>
                    <Input id="file-upload" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setData({ ...data, file: e.target.files ? e.target.files[0] : null, text: "" })} />
                  </label>
                </TabsContent>
              </Tabs>
            <Button onClick={handleNext} className="w-full mt-6" disabled={(data.inputType === 'text' && !data.text.trim()) || (data.inputType === 'upload' && !data.file)}>Próximo</Button>
          </CardContent>
        )}
        
        {step === 3 && (
            <CardContent className="pt-8 pb-8 space-y-6">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <Settings2 className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Customize a Geração</CardTitle>
                    <CardDescription className="mt-2 text-base">Ajuste as opções de IA para o seu material.</CardDescription>
                </div>

                {/* Tipo de Conteúdo */}
                <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-6 space-y-4 border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <Label className="text-base font-semibold">O que deseja criar?</Label>
                  </div>
                  <ToggleGroup
                      type="single" value={data.contentType}
                      onValueChange={(value: WizardData['contentType']) => value && setData({ ...data, contentType: value })}
                      className="w-full grid grid-cols-3 gap-2"
                  >
                      <ToggleGroupItem value="flashcards" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Flashcards
                      </ToggleGroupItem>
                      <ToggleGroupItem value="quiz" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Quiz
                      </ToggleGroupItem>
                      <ToggleGroupItem value="both" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        Ambos
                      </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Flashcards Settings */}
                {(data.contentType === 'flashcards' || data.contentType === 'both') && (
                  <div className="animate-in fade-in-20 duration-300 bg-muted/50 dark:bg-muted/20 rounded-lg p-6 space-y-4 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <Label htmlFor="num-flashcards" className="text-base font-semibold">Número de Flashcards</Label>
                        </div>
                        <span className="text-2xl font-bold text-primary">{data.num_flashcards}</span>
                      </div>
                      <Slider 
                        id="num-flashcards" 
                        min={5} 
                        max={50} 
                        step={1} 
                        value={[data.num_flashcards]} 
                        onValueChange={(v) => setData({ ...data, num_flashcards: v[0] })}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mínimo: 5</span>
                        <span>Máximo: 50</span>
                      </div>
                  </div>
                )}

                {/* Quiz Settings */}
                {(data.contentType === 'quiz' || data.contentType === 'both') && (
                  <div className="animate-in fade-in-20 duration-300 bg-muted/50 dark:bg-muted/20 rounded-lg p-6 space-y-4 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <Label htmlFor="num-questions" className="text-base font-semibold">Perguntas do Quiz</Label>
                        </div>
                        <span className="text-2xl font-bold text-primary">{data.num_questions}</span>
                      </div>
                      <Slider 
                        id="num-questions" 
                        min={3} 
                        max={25} 
                        step={1} 
                        value={[data.num_questions]} 
                        onValueChange={(v) => setData({ ...data, num_questions: v[0] })}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mínimo: 3</span>
                        <span>Máximo: 25</span>
                      </div>
                  </div>
                )}

                {/* Dificuldade */}
                <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-6 space-y-4 border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <Label className="text-base font-semibold">Nível de Dificuldade</Label>
                  </div>
                  <ToggleGroup
                      type="single" value={data.difficulty}
                      onValueChange={(value: string) => value && setData({ ...data, difficulty: value })}
                      className="w-full grid grid-cols-3 gap-2"
                  >
                      <ToggleGroupItem value="Fácil" className="data-[state=on]:bg-green-600 data-[state=on]:text-white dark:data-[state=on]:bg-green-700">
                        Fácil
                      </ToggleGroupItem>
                      <ToggleGroupItem value="Médio" className="data-[state=on]:bg-yellow-600 data-[state=on]:text-white dark:data-[state=on]:bg-yellow-700">
                        Médio
                      </ToggleGroupItem>
                      <ToggleGroupItem value="Difícil" className="data-[state=on]:bg-red-600 data-[state=on]:text-white dark:data-[state=on]:bg-red-700">
                        Difícil
                      </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Button onClick={handleSubmit} className="w-full !mt-8 h-12 text-base font-semibold" disabled={isSubmitting || isProcessing}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        A criar...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Gerar Conteúdo!
                      </div>
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
            <Link href="/library" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4 mr-2" />Voltar para a Biblioteca</Link>
        </div>
        {!isProcessing && <WizardProgress/>}
        <Card className="relative overflow-hidden">{renderStepContent()}</Card>
    </div>
  )
}