import LoginForm from "@/components/auth/login-form";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center gap-2">
        <Image 
          src="/flashify_logo.svg" 
          alt="Flashify Logo" 
          width={40} 
          height={40} 
          className="h-auto"
        />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FFC300] to-[#6BDEF3] bg-clip-text text-transparent">
          Flashify
        </h1>
      </div>

      <Card className="w-full max-w-sm border-border transition-all duration-300 hover:border-primary hover:shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo de volta!</CardTitle>
          <CardDescription>
            Inicie sessão para acessar os seus decks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pt-4">
          <p className="text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Registre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}