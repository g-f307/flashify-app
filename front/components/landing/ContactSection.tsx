// Caminho: components/landing/ContactSection.tsx (Atualizado com Transições)
"use client"; 

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HeroWaveDivider from "./HeroWaveDivider";

const ContactSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Feedback enviado! Obrigado pela sua opinião.");
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
              <p className="text-muted-foreground leading-relaxed">
                Estamos em constante evolução e a sua experiência é a nossa maior fonte de
                inspiração. Partilhe as suas ideias, sugestões ou relate qualquer dificuldade que
                tenha encontrado.
              </p>
            </div>

            {/* Formulário */}
            <div
              className="bg-card rounded-3xl p-8 shadow-card 
                         hover-lift transition-smooth animate-fadeInRight"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="animate-fadeInScale delay-100">
                  <Input
                    type="text"
                    placeholder="Nome"
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth
                             hover:border-accent/50"
                    required
                  />
                </div>
                <div className="animate-fadeInScale delay-200">
                  <Input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth
                             hover:border-accent/50"
                    required
                  />
                </div>
                <div className="animate-fadeInScale delay-300">
                  <Textarea
                    placeholder="A sua mensagem..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border border-border 
                             focus:border-accent transition-smooth resize-none
                             hover:border-accent/50"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground 
                           font-bold py-6 rounded-full shadow-button hover:shadow-xl 
                           transition-smooth hover:scale-105 hover-shimmer
                           animate-fadeInScale delay-400"
                >
                  ENVIAR FEEDBACK
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