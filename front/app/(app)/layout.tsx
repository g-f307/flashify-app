// front/app/(app)/layout.tsx
"use client";

import { useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle"; 
import Image from "next/image";
import {
  Plus,
  Settings,
  Home,
  Library,
  TrendingUp,
  Menu,
  Clock,
  MessageCircle, 
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Progress } from "@/components/ui/progress";
import { GenerationLimitInfo } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const sidebarItems = [
    { href: "/dashboard", label: "Início", icon: Home },
    { href: "/library", label: "Biblioteca", icon: Library },
    { href: "/create", label: "Criar Deck", icon: Plus },
    { href: "/progress", label: "Progresso", icon: TrendingUp },
    { href: "/support", label: "Suporte", icon: MessageCircle }, 
    { href: "/settings", label: "Configurações", icon: Settings },
];

function GenerationLimitBar({ limitInfo }: { limitInfo: GenerationLimitInfo | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!limitInfo) return null;

  const { used, remaining, limit } = limitInfo;
  const percentage = (used / limit) * 100;
  
  const getStatusColor = () => {
    if (percentage >= 90) return "text-red-500 dark:text-red-400";
    if (percentage >= 70) return "text-orange-500 dark:text-orange-400";
    return "text-primary dark:text-[#6BDEF3]";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "[&>div]:bg-red-500 dark:[&>div]:bg-red-400";
    if (percentage >= 70) return "[&>div]:bg-orange-500 dark:[&>div]:bg-orange-400";
    return "[&>div]:bg-primary dark:[&>div]:bg-[#6BDEF3]";
  };

  const getStatusIcon = () => {
    if (percentage >= 90) return "🚫";
    if (percentage >= 70) return "⚠️";
    return "✨";
  };

  const getMessage = () => {
    if (remaining === 0) return "Limite atingido";
    if (remaining === 1) return "Última geração";
    return `${remaining} restantes`;
  };

  const getDetailedMessage = () => {
    if (remaining > 0) {
      return `Você ainda pode realizar ${remaining} gerações hoje.`;
    } else {
      return `Você atingiu o limite de ${limit} decks por dia.`;
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="hidden lg:block w-full px-3 py-2.5 border-t border-border/30 dark:border-zinc-800/50 hover:bg-accent/30 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getStatusIcon()}</span>
                    <span className="text-xs font-medium text-sidebar-foreground">
                      Gerações
                    </span>
                  </div>
                  <span className={cn("text-xs font-bold tabular-nums", getStatusColor())}>
                    {used}/{limit}
                  </span>
                </div>
                
                <Progress 
                  value={percentage} 
                  className={cn("h-1 bg-muted/50 dark:bg-zinc-800/50", getProgressColor())}
                />
                
                <p className="text-[10px] text-sidebar-foreground text-left">
                  {getMessage()}
                </p>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            align="center"
            className="max-w-[280px] p-3 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-sm border-border/50 dark:border-zinc-800/50"
            sideOffset={8}
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{getStatusIcon()}</span>
                <p className="font-semibold text-sm text-foreground">Limite Diário</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                {getDetailedMessage()}
              </p>
              
              {limitInfo.hours_until_reset > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 dark:border-zinc-800/50">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Renova em <strong className="text-foreground">{limitInfo.hours_until_reset}h</strong>
                  </p>
                </div>
              )}
              
              {remaining === 0 && (
                <div className="pt-2 border-t border-border/30 dark:border-zinc-800/50">
                  <p className="text-xs text-muted-foreground italic">
                    💡 Revise seus decks enquanto aguarda!
                  </p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="lg:hidden w-full border-t border-border/30 dark:border-zinc-800/50">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2.5 hover:bg-accent/30 transition-colors duration-200 focus:outline-none"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{getStatusIcon()}</span>
                <span className="text-xs font-medium text-sidebar-foreground">
                  Gerações
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold tabular-nums", getStatusColor())}>
                  {used}/{limit}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
            
            <Progress 
              value={percentage} 
              className={cn("h-1 bg-muted/50 dark:bg-zinc-800/50", getProgressColor())}
            />
            
            <p className="text-[10px] text-sidebar-foreground text-left">
              {getMessage()}
            </p>
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 bg-muted/30 dark:bg-zinc-800/30 animate-in slide-in-from-top duration-200">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {getDetailedMessage()}
            </p>
            
            {limitInfo.hours_until_reset > 0 && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 dark:border-zinc-800/50">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Renova em <strong className="text-foreground">{limitInfo.hours_until_reset}h</strong>
                </p>
              </div>
            )}
            
            {remaining === 0 && (
              <div className="pt-2 border-t border-border/30 dark:border-zinc-800/50">
                <p className="text-xs text-muted-foreground italic">
                  💡 Revise seus decks enquanto aguarda!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { limitInfo } = useGenerationLimit();

  useEffect(() => {
    document.body.classList.add('app-layout');
    return () => {
      document.body.classList.remove('app-layout');
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Carregando sua sessão..." 
        fullScreen={true}
      />
    );
  }

  if (!user) {
    return null;
  }

  const AppLogo = () => (
    <Link href="/dashboard" className="flex items-center justify-center gap-2">
      <Image 
        src="/flashify_logo.svg" 
        alt="Flashify Logo" 
        width={40}
        height={40}
        className="h-auto"
      />
      <span className="text-3xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
        Flashify
      </span>
    </Link>
  );

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg flex flex-col transition-transform duration-300 ease-in-out lg:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 lg:p-6 border-b border-border dark:border-zinc-800 flex-shrink-0">
          <AppLogo />
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              
              let isActive = false;
              if (item.href === '/dashboard') {
                isActive = pathname === '/dashboard';
              } else if (item.href === '/library') {
                isActive = pathname.startsWith('/library') || 
                           pathname.startsWith('/deck/') || 
                           pathname.startsWith('/study/') || 
                           pathname.startsWith('/quiz/');
              } else {
                isActive = pathname.startsWith(item.href);
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-primary/20"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <GenerationLimitBar limitInfo={limitInfo} />

        <div className="p-4 mt-auto border-t border-border dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.profile_picture_url} alt={user?.username} />
              <AvatarFallback>{getInitials(user?.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.username || "Utilizador"}
              </p>
              <div className="flex items-center justify-between w-full mt-1">
                <button
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Sair
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ✅ CORREÇÃO REAL: Main com flex-1 e overflow-auto direto */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="lg:hidden flex items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-background flex-shrink-0">
          <div className="flex-1 flex justify-start">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 hover:bg-accent rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                  src="/flashify_logo.svg"
                  alt="Flashify Logo"
                  width={28}
                  height={28}
              />
              <span className="text-xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
                  Flashify
              </span>
            </Link>
          </div>

          <div className="flex-1 flex justify-end items-center gap-3">
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <ThemeToggle />
          </div>
        </header>
        
        {/* ✅ Conteúdo com padding adequado */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}