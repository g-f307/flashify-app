"use client"

import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Loader2 } from "lucide-react"

export function GoogleLoginButton() {
  const { googleLogin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true)
      try {
        await googleLogin(tokenResponse.code, redirectTo)
      } catch (err: any) {
        console.error("Falha no login com Google:", err)
        setError(err.message || "Não foi possível fazer login com o Google.")
      } finally {
        setIsLoading(false)
      }
    },
    onError: (errorResponse) => {
      console.error("Erro no fluxo do Google OAuth:", errorResponse)
      setError("Ocorreu um erro durante a autenticação com o Google.")
      setIsLoading(false)
    },
    flow: "auth-code",
  })

  return (
    <div>
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2 border-border dark:border-white/10 transition-all duration-200 hover:bg-accent hover:border-primary/50 hover:shadow-md"
        onClick={() => {
          setError(null)
          handleLogin()
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Image src="/google_logo.png" alt="Google logo" width={18} height={18} />
        )}
        {isLoading ? "Conectando..." : "Entrar com Google"}
      </Button>
      {error && (
        <div className="mt-2 p-2 bg-destructive/10 border border-border dark:border-white/20 rounded-md">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
