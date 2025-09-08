"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { checkAuth } = useAuth();
  const router = useRouter();

  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      try {
        await apiClient.loginWithGoogle(codeResponse.code);
        await checkAuth(); // Atualiza o estado de autenticação
        router.push('/'); // Redireciona para o dashboard
      } catch (error) {
        console.error("Falha no login com Google:", error);
        // Exibir um toast de erro aqui
      } finally {
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Erro no login com Google:', errorResponse);
    },
  });

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => handleGoogleLogin()}
      disabled={isLoading}
    >
      {isLoading ? "Verificando..." : "Entrar com Google"}
    </Button>
  );
}