"use client";

import { useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle"; 
import SplashScreen from "@/components/splash-screen";
import Image from "next/image";
import { Brain,
  Plus,
  Settings,
  User,
  Home,
  Library,
  TrendingUp,
  Menu,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
    { href: "/", label: "Início", icon: Home },
    { href: "/library", label: "Biblioteca", icon: Library },
    { href: "/create", label: "Criar Conjunto", icon: Plus },
    { href: "/progress", label: "Progresso", icon: TrendingUp },
    { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Se a verificação de autenticação terminou e não há utilizador, força o redirecionamento para o login.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Verifica se é a primeira visita do usuário
    const hasVisited = localStorage.getItem('flashify-visited');
    if (hasVisited) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    localStorage.setItem('flashify-visited', 'true');
    setShowSplash(false);
  };

  // Mostra o splash screen na primeira visita
  if (showSplash && user && !loading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // Mostra um ecrã de carregamento em tela cheia enquanto a autenticação está a ser verificada.
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

  // Se o utilizador estiver autenticado, renderiza o layout completo da aplicação.
  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg-hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg flex flex-col transition-transform duration-300 ease-in-out lg:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 lg:p-6 shadow-sm">
          <div className="flex justify-center items-center">
            <Link href="/" className="flex flex-col items-center justify-center h-20 w-full">
              {/* Substitua o src pela sua imagem de logo */}
              <Image src="/flashify_logo.svg" alt="Flashify Logo" width={80} height={80} className="rounded-lg mx-auto" />
            </Link>

          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              // A rota raiz '/' é a página de início, as outras verificam se o caminho começa com o href
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
                        : "text-sidebar-foreground hover:bg-primary/20 hover:text-primary-foreground"
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

        <div className="p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.username || "Utilizador"}
              </p>
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                >
                  Sair
                </button>
                <ThemeToggle></ThemeToggle>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-accent rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center gap-2">
            {/* Substitua o src pela sua imagem de logo */}
            <Image src="/flashify_logo.svg" alt="Flashify Logo" width={40} height={40} className="rounded" />

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