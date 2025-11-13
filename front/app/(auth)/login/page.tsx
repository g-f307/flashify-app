import LoginForm from "@/components/auth/login-form"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 w-full px-4 sm:px-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md flex items-center justify-between mb-2">
        <Button 
          variant="ghost" 
          size="sm"
          asChild
          className="hover:bg-accent transition-colors"
        >
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 animate-in slide-in-from-top duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 blur-xl opacity-30 animate-pulse"></div>
          <Image 
            src="/flashify_logo.svg" 
            alt="Flashify Logo" 
            width={36} 
            height={36} 
            className="h-auto relative z-10 sm:w-10 sm:h-10"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
          Flashify
        </h1>
      </div>

      <Card className="w-full max-w-md border-border dark:border-white/10 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-2xl animate-in slide-in-from-bottom duration-700">
        <CardHeader className="text-center space-y-2 pb-4 sm:pb-6 px-4 sm:px-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bem-vindo de volta!
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Inicie sessão para acessar os seus decks.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4 sm:pb-6 px-4 sm:px-6">
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-4 border-t border-border dark:border-white/10 px-4 sm:px-6">
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