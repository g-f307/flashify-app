"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form"; // Importa o Controller
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface BugReportFormData {
  priority: string;
  category: string;
  title: string;
  steps: string;
  expected: string;
  actual: string;
  frequency: string;
  additionalInfo?: string;
}

interface Props {
  onBack: () => void;
}

export function BugReportForm({ onBack }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Obtém o 'control' do useForm
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<BugReportFormData>();

  const onSubmit = async (data: BugReportFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/support/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Falha ao enviar');

      setIsSuccess(true);
      toast.success("Relatório enviado!", { 
        description: "Obrigado! Vamos investigar o problema." 
      });

      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error) {
      toast.error("Erro ao enviar", { 
        description: "Tente novamente ou contate o suporte." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Relatório Enviado!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Recebemos seu relatório e nossa equipe já está analisando. Obrigado por nos ajudar a melhorar!
        </p>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onBack} 
        className="w-fit mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Relatar um Bug</h1>
        <p className="text-muted-foreground">
          Preencha os campos abaixo para nos ajudar a identificar e corrigir o problema.
        </p>
      </div>
      
      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Prioridade */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Qual a gravidade do problema? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup 
              onValueChange={(value) => setValue('priority', value)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {/* ... opções de prioridade ... */}
              <div>
                <RadioGroupItem 
                  value="baixa" 
                  id="baixa" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="baixa"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">🟢 Baixa</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Pequeno inconveniente
                  </span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="media" 
                  id="media" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="media"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">🟡 Média</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Afeta o uso normal
                  </span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="alta" 
                  id="alta" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="alta"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">🔴 Alta</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Impede o uso
                  </span>
                </Label>
              </div>
            </RadioGroup>
            {errors.priority && (
              <p className="text-sm text-red-500">Selecione a gravidade</p>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-base font-semibold">
              Em qual área ocorreu? <span className="text-red-500">*</span>
            </Label>
            <Select onValueChange={(value) => setValue('category', value)}>
              <SelectTrigger className="border-2 border-muted-foreground/30 focus:border-primary">
                <SelectValue placeholder="Selecione uma área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="login">Login / Autenticação</SelectItem>
                <SelectItem value="upload">Upload de Arquivos</SelectItem>
                <SelectItem value="flashcards">Geração de Flashcards</SelectItem>
                <SelectItem value="quiz">Geração de Quiz</SelectItem>
                <SelectItem value="study">Modo de Estudo</SelectItem>
                <SelectItem value="folders">Organização (Pastas)</SelectItem>
                <SelectItem value="performance">Desempenho / Lentidão</SelectItem>
                <SelectItem value="visual">Problemas Visuais</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Título resumido */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Resuma o problema em uma frase <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Não consigo fazer upload de PDF"
              {...register('title', { required: true })}
              className="text-base border-2 border-muted-foreground/30 focus:border-primary"
            />
            {errors.title && (
              <p className="text-sm text-red-500">Campo obrigatório</p>
            )}
          </div>

          {/* Passos para reproduzir */}
          <div className="space-y-2">
            <Label htmlFor="steps" className="text-base font-semibold">
              Como reproduzir o problema? <span className="text-red-500">*</span>
            </Label>
            {/* Substitui Textarea por Controller */}
            <Controller
              name="steps"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <Textarea
                  id="steps"
                  placeholder="1. Vou até a página de criar deck&#10;2. Seleciono um PDF&#10;3. Clico em enviar&#10;4. Aparece erro..."
                  rows={5}
                  className="text-base resize-none border-2 border-muted-foreground/30 focus:border-primary"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value || ''}
                  name={name}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Liste os passos de forma numerada e clara
            </p>
            {errors.steps && (
              <p className="text-sm text-red-500">Campo obrigatório</p>
            )}
          </div>

          {/* O que esperava vs O que aconteceu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected" className="text-base font-semibold">
                O que você esperava? <span className="text-red-500">*</span>
              </Label>
              {/* Substitui Textarea por Controller */}
              <Controller
                name="expected"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value, name } }) => (
                  <Textarea
                    id="expected"
                    placeholder="Eu esperava que o arquivo fosse carregado..."
                    rows={4}
                    className="text-base resize-none border-2 border-muted-foreground/30 focus:border-primary"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value || ''}
                    name={name}
                  />
                )}
              />
               {errors.expected && (
                <p className="text-sm text-red-500">Campo obrigatório</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actual" className="text-base font-semibold">
                O que aconteceu? <span className="text-red-500">*</span>
              </Label>
              {/* Substitui Textarea por Controller */}
              <Controller
                name="actual"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value, name } }) => (
                  <Textarea
                    id="actual"
                    placeholder="Mas o que aconteceu foi..."
                    rows={4}
                    className="text-base resize-none border-2 border-muted-foreground/30 focus:border-primary"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value || ''}
                    name={name}
                  />
                )}
              />
              {errors.actual && (
                <p className="text-sm text-red-500">Campo obrigatório</p>
              )}
            </div>
          </div>

          {/* Frequência */}
          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-base font-semibold">
              Com que frequência isso acontece?
            </Label>
            <Select onValueChange={(value) => setValue('frequency', value)}>
              <SelectTrigger className="border-2 border-muted-foreground/30 focus:border-primary">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sempre">Sempre / Toda vez</SelectItem>
                <SelectItem value="frequente">Frequentemente</SelectItem>
                <SelectItem value="as_vezes">Às vezes</SelectItem>
                <SelectItem value="raro">Raramente</SelectItem>
                <SelectItem value="uma_vez">Aconteceu apenas uma vez</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Informações adicionais (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo" className="text-base font-semibold">
              Informações adicionais (opcional)
            </Label>
            {/* Substitui Textarea por Controller */}
            <Controller
              name="additionalInfo"
              control={control}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <Textarea
                  id="additionalInfo"
                  placeholder="Capturas de tela, mensagens de erro específicas, navegador usado, etc."
                  rows={4}
                  className="text-base resize-none border-2 border-muted-foreground/30 focus:border-primary"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value || ''}
                  name={name}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Qualquer detalhe extra que possa ajudar
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Relatório'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}