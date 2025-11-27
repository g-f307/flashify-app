import RegisterForm from "@/components/auth/register-form"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function RegisterPage() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full px-4 sm:px-6 py-4 sm:py-6 animate-in fade-in duration-500 min-h-screen overflow-hidden">
      {/* Controles no canto superior direito */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Botão voltar no canto superior esquerdo */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
        <Button 
          variant="ghost" 
          size="sm"
          asChild
          className="hover:bg-accent transition-colors h-8 sm:h-9"
        >
          <Link href="/" className="flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Voltar</span>
          </Link>
        </Button>
      </div>

      {/* Conteúdo centralizado */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 animate-in slide-in-from-top duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-30 animate-pulse"></div>
            <Image 
              src="/flashify_logo.svg" 
              alt="Flashify Logo" 
              width={32} 
              height={32} 
              className="h-auto relative z-10"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
            Flashify
          </h1>
        </div>

        <Card className="w-full border-border dark:border-white/10 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-2xl animate-in slide-in-from-bottom duration-700">
          <CardHeader className="text-center space-y-2 pb-4 px-6 pt-6">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              Crie a sua conta
            </CardTitle>
            <CardDescription className="text-sm">
              Comece a estudar de forma mais inteligente e otimizada hoje mesmo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-6">
            <RegisterForm />
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center pt-4 border-t border-border dark:border-white/10 px-6 pb-6">
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link 
                href="/login" 
                className="font-semibold text-primary hover:underline transition-all"
              >
                Faça login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}