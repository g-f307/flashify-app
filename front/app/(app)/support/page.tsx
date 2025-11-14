"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, MessageSquare, Lightbulb, Send } from "lucide-react";
import { motion } from "framer-motion";
import { BugReportForm } from "@/components/support/bug-report-form";
import { ExperienceForm } from "@/components/support/experience-form";
import { SuggestionForm } from "@/components/support/suggestion-form";

type FormType = 'bug' | 'experience' | 'suggestion' | null;

const formOptions = [
  {
    id: 'bug' as FormType,
    icon: Bug,
    title: "Relatar um Bug",
    description: "Encontrou algo que não está funcionando? Nos ajude a corrigir!",
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-500/10 dark:bg-red-500/20",
    borderColor: "border-red-500/30 hover:border-red-500/50"
  },
  {
    id: 'experience' as FormType,
    icon: MessageSquare,
    title: "Relatar Experiência",
    description: "Compartilhe como foi usar o Flashify e nos ajude a melhorar.",
    color: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
    borderColor: "border-blue-500/30 hover:border-blue-500/50"
  },
  {
    id: 'suggestion' as FormType,
    icon: Lightbulb,
    title: "Sugerir Melhorias",
    description: "Tem uma ideia para tornar o Flashify ainda melhor? Adoramos ouvir!",
    color: "text-yellow-500 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10 dark:bg-yellow-500/20",
    borderColor: "border-yellow-500/30 hover:border-yellow-500/50"
  }
];

export default function SupportPage() {
  const [selectedForm, setSelectedForm] = useState<FormType>(null);

  const renderForm = () => {
    switch(selectedForm) {
      case 'bug':
        return <BugReportForm onBack={() => setSelectedForm(null)} />;
      case 'experience':
        return <ExperienceForm onBack={() => setSelectedForm(null)} />;
      case 'suggestion':
        return <SuggestionForm onBack={() => setSelectedForm(null)} />;
      default:
        return null;
    }
  };

  if (selectedForm) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-4xl mx-auto"
      >
        {renderForm()}
      </motion.div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Central de Suporte</h1>
        <p className="text-muted-foreground mt-1">
          Como podemos ajudar você hoje? Escolha uma opção abaixo.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${option.borderColor} h-full`}
                onClick={() => setSelectedForm(option.id)}
              >
                <CardHeader className="space-y-4">
                  <div className={`w-14 h-14 rounded-2xl ${option.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${option.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{option.title}</CardTitle>
                    <CardDescription className="mt-2 leading-relaxed">
                      {option.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    Abrir formulário
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">💡 Dica</CardTitle>
          <CardDescription className="leading-relaxed">
            Quanto mais detalhes você fornecer, melhor conseguiremos entender e atender sua solicitação. 
            Agradecemos por dedicar seu tempo para nos ajudar a melhorar!
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}