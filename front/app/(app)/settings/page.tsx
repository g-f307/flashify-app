// front/app/(app)/settings/page.tsx

"use client";

import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, LogOut, Palette, Cpu, ChevronRight } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ThemeSelector } from "@/components/theme-selector";
import Link from "next/link";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Conta</h1>
        <p className="text-muted-foreground mt-1">
          Gira as suas informações pessoais, preferências e segurança.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Estas são as suas informações públicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.profile_picture_url} alt={user?.username} />
              <AvatarFallback>{getInitials(user?.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow text-center sm:text-left">
              <h2 className="text-xl font-semibold">{user?.username}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        
        {/* * ==========================================================
          * * MUDANÇAS NO CARD DE CONSUMO DE IA (v2)
          * * ==========================================================
        */}
        <Card className="hover:shadow-md transition-all group relative flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                {/* Ícone sem 'text-primary' */}
                <Cpu className="h-5 w-5" />
              <span>Consumo de IA</span>
            </CardTitle>
            
            {/*
              * DOCUMENTAÇÃO DA MUDANÇA:
              * Os dois textos ("Entenda..." e "Saiba mais...") foram
              * fundidos aqui numa única descrição.
              * A classe 'pt-2' adiciona um pequeno espaço após o título.
            */}
            <CardDescription className="pt-2">
              Entenda como funcionam as gerações com Inteligência Artificial
              e saiba mais sobre limites diários.
            </CardDescription>
          </CardHeader>
          
          {/*
            * DOCUMENTAÇÃO DA MUDANÇA:
            * O CardContent agora contém apenas o ícone de seta.
            * 'pt-0' é o padrão do shadcn/ui.
            * Usamos 'flex justify-end' para alinhar a seta à direita.
          */}
          <CardContent className="pt-0">
            <div className="flex items-center justify-end">
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>

          {/* O link overlay continua a cobrir todo o card */}
          <Link href="/settings/ai-usage" className="absolute inset-0 z-10">
            <span className="sr-only">Ver Consumo de IA</span>
          </Link>
        </Card>
        {/* ==========================================================
          * FIM DAS MUDANÇAS NO CARD
          * ==========================================================
        */}


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize o visual da aplicação.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ThemeSelector />
          </CardContent>
        </Card>

        {user?.provider === 'local' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>
                Altere a sua senha para manter a conta segura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">Alterar Senha</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Alterar a sua senha</DialogTitle>
                    <DialogDescription>
                      Insira a sua senha atual antes de definir uma nova.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <ChangePasswordForm />
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Sessão
            </CardTitle>
            <CardDescription>
              Encerre a sua sessão atual com segurança.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout} className="w-full">
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}