"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import Image from "next/image";

export function GoogleLoginButton() {
  const { googleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await googleLogin(tokenResponse.code);
      } catch (err: any) {
        console.error("Falha no login com Google:", err);
        setError(err.message || "Não foi possível fazer login com o Google.");
      }
    },
    onError: (errorResponse) => {
      console.error("Erro no fluxo do Google OAuth:", errorResponse);
      setError("Ocorreu um erro durante a autenticação com o Google.");
    },
    flow: "auth-code", 
  });

  return (
    <div>
      <Button
        variant="outline"
        className="w-full flex items-center justify-center gap-2"
        onClick={() => handleLogin()}
      >
        <Image src="/google_logo.png" alt="Google logo" width={18} height={18} />
        Entrar com Google
      </Button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}