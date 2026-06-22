// front/app/(app)/settings/page.tsx

"use client";

import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, LogOut, Palette, Volume2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useSound } from "@/contexts/sound-context";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { soundEnabled, setSoundEnabled } = useSound();

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Sons
            </CardTitle>
            <CardDescription>
              Ative efeitos sutis para respostas, conclusão de estudos e navegação de cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 dark:border-zinc-800">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Efeitos sonoros
                </p>
                <p className="text-sm text-muted-foreground">
                  Reproduz sons em flashcards, quizzes, estudo guiado e relatórios.
                </p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                aria-label="Ativar efeitos sonoros"
              />
            </div>
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
