// Caminho: components/landing/ContactSection.tsx (Atualizado com WhatsApp e Email)
"use client"; 

import { useState } from "react";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HeroWaveDivider from "./HeroWaveDivider";

const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Formatar o corpo do email
    const emailBody = `
Nome: ${formData.name}
E-mail: ${formData.email}

Mensagem:
${formData.message}

---
Enviado via formulário de contato do Flashify
Data: ${new Date().toLocaleString('pt-BR')}
    `.trim();

    // Criar o link mailto
    const mailtoLink = `mailto:flashify.study@gmail.com?subject=Feedback do Flashify - ${formData.name}&body=${encodeURIComponent(emailBody)}`;

    // Abrir o cliente de email
    window.location.href = mailtoLink;

    // Simular tempo de processamento
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      
      // Resetar o formulário
      setFormData({
        name: "",
        email: "",
        message: ""
      });

      // Esconder mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section 
      id="contact" 
      className="relative bg-muted pt-32 md:pt-40 pb-60"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Informações */}
            <div className="animate-fadeInLeft">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-6
                            transition-smooth hover:scale-110 hover:rotate-12">
                <MessageSquare className="w-8 h-8 text-accent-foreground" />
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                A sua opinião constrói o futuro do Flashify
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Estamos em constante evolução e a sua experiência é a nossa maior fonte de
                inspiração. Compartilhe suas ideias, sugestões ou relate qualquer dificuldade que
                tenha encontrado.
              </p>
              
              {/* Canal do WhatsApp - Botão em Destaque */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-muted-foreground mb-4">
                  Quer falar com a equipe ou acompanhar as novidades?
                </p>
                <div className="flex flex-col gap-3 md:items-start">
                  <a 
                    href="https://wa.me/message/UDBVSRGDHXOAC1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 
                             bg-green-600 hover:bg-green-700 text-white font-semibold 
                             rounded-full shadow-lg hover:shadow-xl transition-smooth 
                             hover:scale-105 group w-full md:w-auto"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-5 h-5 flex-shrink-0 fill-current group-hover:scale-110 transition-transform"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>Converse com o Flashify no WhatsApp</span>
                  </a>

                  <a 
                    href="https://whatsapp.com/channel/0029VbBUnnb90x30IAt5rQ2S" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 
                             border border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400 font-semibold 
                             rounded-full shadow-sm hover:bg-green-600/15 transition-smooth 
                             hover:scale-105 group w-full md:w-auto"
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      className="w-5 h-5 flex-shrink-0 fill-current group-hover:scale-110 transition-transform"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>Participe do Canal no WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div
              className="bg-card rounded-3xl p-8 shadow-card 
                         hover-lift transition-smooth animate-fadeInRight relative overflow-hidden"
            >
              {/* Mensagem de Sucesso */}
              {showSuccess && (
                <div className="absolute inset-0 bg-card/95 backdrop-blur-sm z-10 
                              flex items-center justify-center animate-fadeInScale">
                  <div className="text-center px-8">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Feedback Recebido!
                    </h3>
                    <p className="text-muted-foreground">
                      Obrigado por compartilhar sua opinião conosco. 
                      Seu cliente de e-mail foi aberto para enviar a mensagem.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="animate-fadeInScale delay-100">
                  <Input
                    type="text"
                    name="name"
                    placeholder="Nome"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth
                             hover:border-accent/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="animate-fadeInScale delay-200">
                  <Input
                    type="email"
                    name="email"
                    placeholder="E-mail"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth
                             hover:border-accent/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="animate-fadeInScale delay-300">
                  <Textarea
                    name="message"
                    placeholder="Compartilhe suas ideias, sugestões ou dificuldades..."
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth resize-none
                             hover:border-accent/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground 
                           font-bold py-6 rounded-full shadow-button hover:shadow-xl 
                           transition-smooth hover:scale-105 hover-shimmer
                           animate-fadeInScale delay-400 disabled:opacity-50 
                           disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                          fill="none"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="w-5 h-5" />
                      ENVIAR FEEDBACK
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <HeroWaveDivider position="bottom" color="fill-card" />
    </section>
  );
};

export default ContactSection;
