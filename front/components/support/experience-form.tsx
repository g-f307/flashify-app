"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExperienceFormData {
  rating: string;
  easeOfUse: string;
  mostUsedFeature: string;
  wouldRecommend: string;
  feedback?: string;
}

interface Props {
  onBack: () => void;
}

export function ExperienceForm({ onBack }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<ExperienceFormData>();

  const onSubmit = async (data: ExperienceFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/support/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Falha ao enviar');

      setIsSuccess(true);
      toast.success("Feedback enviado!", { 
        description: "Agradecemos por compartilhar sua experiência!" 
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
        <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Obrigado pelo Feedback!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Sua opinião é muito importante para nós e nos ajuda a criar uma melhor experiência.
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
        <h1 className="text-2xl font-bold mb-2">Relatar Experiência</h1>
        <p className="text-muted-foreground">
          Queremos saber como tem sido sua jornada com o Flashify!
        </p>
      </div>
      
      {/* ✅ CORREÇÃO: Container do formulário com max-height e scroll */}
      <div className="max-h-[calc(100vh-16rem)] lg:max-h-none overflow-y-auto pr-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avaliação Geral */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Como você avalia sua experiência geral? <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setSelectedRating(star);
                    setValue('rating', star.toString(), { shouldValidate: true });
                  }}
                  className={cn(
                    "transition-all duration-200 hover:scale-110",
                    selectedRating >= star ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"
                  )}
                >
                  <Star 
                    className="w-10 h-10 sm:w-12 sm:h-12" 
                    fill={selectedRating >= star ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Muito ruim</span>
              <span>Excelente</span>
            </div>
            <input type="hidden" {...register('rating', { required: true })} />
            {errors.rating && (
              <p className="text-sm text-red-500 text-center">Selecione uma avaliação</p>
            )}
          </div>

          {/* Facilidade de Uso */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              O Flashify é fácil de usar? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup 
              onValueChange={(value) => setValue('easeOfUse', value)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem 
                  value="muito_facil" 
                  id="muito_facil" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="muito_facil"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl mb-2">😊</span>
                  <span className="text-sm font-medium">Muito fácil</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="normal" 
                  id="normal" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="normal"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl mb-2">😐</span>
                  <span className="text-sm font-medium">Normal</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="dificil" 
                  id="dificil" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="dificil"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-2xl mb-2">😕</span>
                  <span className="text-sm font-medium">Difícil</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Funcionalidade mais usada */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Qual funcionalidade você mais usa? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup 
              onValueChange={(value) => setValue('mostUsedFeature', value)}
              className="space-y-2"
            >
              {[
                { value: 'flashcards', label: '📚 Estudar com Flashcards' },
                { value: 'quiz', label: '🎯 Fazer Quizzes' },
                { value: 'upload', label: '📄 Upload de PDFs/Imagens' },
                { value: 'folders', label: '📁 Organização em Pastas' },
                { value: 'progress', label: '📊 Acompanhar Progresso' },
                { value: 'outros', label: '✨ Outros' }
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={value} />
                  <Label htmlFor={value} className="cursor-pointer">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Recomendaria? */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Você recomendaria o Flashify para outras pessoas? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup 
              onValueChange={(value) => setValue('wouldRecommend', value)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem 
                  value="sim" 
                  id="sim" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="sim"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 [&:has([data-state=checked])]:border-green-500 [&:has([data-state=checked])]:bg-green-500/10 cursor-pointer"
                >
                  <span className="text-2xl mb-2">👍</span>
                  <span className="text-sm font-medium">Sim, com certeza!</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="talvez" 
                  id="talvez" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="talvez"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-yellow-500 [&:has([data-state=checked])]:border-yellow-500 [&:has([data-state=checked])]:bg-yellow-500/10 cursor-pointer"
                >
                  <span className="text-2xl mb-2">🤔</span>
                  <span className="text-sm font-medium">Talvez</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="nao" 
                  id="nao" 
                  className="peer sr-only" 
                />
                <Label
                  htmlFor="nao"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 [&:has([data-state=checked])]:border-red-500 [&:has([data-state=checked])]:bg-red-500/10 cursor-pointer"
                >
                  <span className="text-2xl mb-2">👎</span>
                  <span className="text-sm font-medium">Não</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comentários Adicionais (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-base font-semibold">
              Quer compartilhar mais alguma coisa? (opcional)
            </Label>
            <Controller
              name="feedback"
              control={control}
              render={({ field: { onChange, onBlur, value, name } }) => (
                <Textarea
                  id="feedback"
                  placeholder="Conte-nos mais sobre sua experiência, o que você mais gostou, o que poderia melhorar..."
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
              Seu feedback detalhado nos ajuda muito!
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
                'Enviar Feedback'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}