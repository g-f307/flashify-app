import LoginForm from "@/components/auth/login-form"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 w-full px-4 sm:px-6 py-2 sm:py-3 animate-in fade-in duration-500 min-h-screen justify-start overflow-hidden">
      <div className="w-full max-w-md flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          asChild
          className="hover:bg-accent transition-colors h-7 sm:h-8"
        >
          <Link href="/" className="flex items-center gap-1.5">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Voltar</span>
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2 animate-in slide-in-from-top duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 blur-xl opacity-30 animate-pulse"></div>
          <Image 
            src="/flashify_logo.svg" 
            alt="Flashify Logo" 
            width={28} 
            height={28} 
            className="h-auto relative z-10 sm:w-8 sm:h-8 md:w-9 md:h-9"
          />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
          Flashify
        </h1>
      </div>

      <Card className="w-full max-w-md border-border dark:border-white/10 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-2xl animate-in slide-in-from-bottom duration-700">
        <CardHeader className="text-center space-y-1 sm:space-y-1.5 pb-2 sm:pb-3 px-4 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
            Bem-vindo de volta!
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Inicie sessão para acessar os seus decks.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 sm:pb-3 px-4 sm:px-6">
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-2 sm:pt-3 border-t border-border dark:border-white/10 px-4 sm:px-6 pb-3 sm:pb-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Ainda não tem uma conta?{" "}
            <Link 
              href="/register" 
              className="font-semibold text-primary hover:underline transition-all"
            >
              Registre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}