"use client";

import { useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle"; 
import { Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Brain,
  Plus,
  Settings,
  User,
  Home,
  Library,
  TrendingUp,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 🔽 ALTERAÇÃO: Terminologia atualizada para "Deck" 🔽
const sidebarItems = [
    { href: "/", label: "Início", icon: Home },
    { href: "/library", label: "Biblioteca", icon: Library },
    { href: "/create", label: "Criar Deck", icon: Plus },
    { href: "/progress", label: "Progresso", icon: TrendingUp },
    { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="flex items-center text-muted-foreground mt-4">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    A carregar a sua sessão...
                </div>
            </div>
        </div>
    );
  }

  // Componente reutilizável para o logo
  const AppLogo = () => (
    <Link href="/" className="flex items-center justify-center gap-2">
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
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg flex flex-col transition-transform duration-300 ease-in-out lg:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 lg:p-6 border-b border-border dark:border-zinc-800">
          <AppLogo />
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
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

        <div className="p-4 mt-auto border-t border-border dark:border-zinc-800">
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

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 🔽 ALTERAÇÃO: Logo no header mobile agora é idêntico ao da sidebar 🔽 */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-accent rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center">
            {/* Usando o mesmo componente de Logo */}
            <Link href="/" className="flex items-center justify-center gap-2">
              <Image src="/flashify_logo.svg" alt="Flashify Logo" width={32} height={32} />
            </Link>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
        </div>
      </main>
    </div>
  );
}