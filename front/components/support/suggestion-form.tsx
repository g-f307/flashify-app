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

interface SuggestionFormData {
  category: string;
  impact: string;
  title: string;
  description: string;
  useCase?: string;
}

interface Props {
  onBack: () => void;
}

export function SuggestionForm({ onBack }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Obtém o 'control' do useForm
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<SuggestionFormData>();

  const onSubmit = async (data: SuggestionFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/support/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Falha ao enviar');

      setIsSuccess(true);
      toast.success("Sugestão enviada!", { 
        description: "Adoramos sua ideia! Vamos avaliar com carinho." 
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
        <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sugestão Recebida!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Obrigado por contribuir! Vamos analisar sua sugestão e considerar para futuras atualizações.
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
        <h1 className="text-2xl font-bold mb-2">Sugerir Melhorias</h1>
        <p className="text-muted-foreground">
          Compartilhe suas ideias para tornar o Flashify ainda melhor!
        </p>
      </div>
      
      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Categoria da Sugestão */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-base font-semibold">
              Esta sugestão está relacionada a qual área? <span className="text-red-500">*</span>
            </Label>
            <Select onValueChange={(value) => setValue('category', value)}>
              <SelectTrigger className="border-2 border-muted-foreground/30 focus:border-primary">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flashcards">📚 Flashcards</SelectItem>
                <SelectItem value="quiz">🎯 Quizzes</SelectItem>
                <SelectItem value="study_mode">📖 Modo de Estudo</SelectItem>
                <SelectItem value="organization">📁 Organização (Pastas/Biblioteca)</SelectItem>
                <SelectItem value="progress">📊 Acompanhamento de Progresso</SelectItem>
                <SelectItem value="ia">🤖 Inteligência Artificial</SelectItem>
                <SelectItem value="interface">🎨 Interface / Design</SelectItem>
                <SelectItem value="mobile">📱 Versão Mobile</SelectItem>
                <SelectItem value="integrations">🔗 Integrações</SelectItem>
                <SelectItem value="gamification">🎮 Gamificação</SelectItem>
                <SelectItem value="outros">✨ Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Impacto da Sugestão */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Qual seria o impacto desta melhoria para você? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup 
              onValueChange={(value) => setValue('impact', value)}
              className="space-y-2"
            >
              {/* ... opções de impacto ... */}
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="alto" id="alto" />
                <Label htmlFor="alto" className="cursor-pointer flex-1">
                  <div className="font-medium">🔥 Alto impacto</div>
                  <div className="text-xs text-muted-foreground">Mudaria significativamente minha experiência</div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="medio" id="medio" />
                <Label htmlFor="medio" className="cursor-pointer flex-1">
                  <div className="font-medium">💡 Impacto moderado</div>
                  <div className="text-xs text-muted-foreground">Melhoraria minha experiência de forma notável</div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                <RadioGroupItem value="baixo" id="baixo" />
                <Label htmlFor="baixo" className="cursor-pointer flex-1">
                  <div className="font-medium">✨ Seria legal ter</div>
                  <div className="text-xs text-muted-foreground">Um adicional interessante, mas não essencial</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Título da Sugestão */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Resuma sua sugestão em uma frase <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Adicionar modo escuro para os flashcards"
              {...register('title', { required: true })}
              className="text-base border-2 border-muted-foreground/30 focus:border-primary"
            />
            {errors.title && (
              <p className="text-sm text-red-500">Campo obrigatório</p>
            )}
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Descreva sua sugestão em detalhes <span className="text-red-500">*</span>
            </Label>
            {/* Substitui Textarea por Controller */}
            <Controller
              name="description"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <Textarea
                  id="description"
                  placeholder="Explique sua ideia: o que seria, como funcionaria, quais benefícios traria..."
                  rows={6}
                  className="text-base resize-none border-2 border-muted-foreground/30 focus:border-primary"
                  onChange={onChange}
                  onBlur={onBlur}
                  value={value || ''}
                  name={name}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais detalhes, melhor conseguiremos entender sua visão!
            </p>
            {errors.description && (
              <p className="text-sm text-red-500">Campo obrigatório</p>
            )}
          </div>

          {/* Caso de Uso (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="useCase" className="text-base font-semibold">
              Dê um exemplo de como você usaria isso (opcional)
            </Label>
            {/* Substitui Textarea por Controller */}
            <Controller
              name="useCase"
              control={control}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <Textarea
                  id="useCase"
                  placeholder="Ex: Quando estou estudando à noite, seria útil ter um modo escuro para não cansar meus olhos..."
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
              Um exemplo prático nos ajuda a entender melhor o contexto
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-foreground">
              <strong>💡 Dica:</strong> Não se preocupe se sua sugestão já foi feita por outra pessoa. 
              Múltiplos pedidos nos ajudam a priorizar as funcionalidades mais desejadas!
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
                'Enviar Sugestão'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}