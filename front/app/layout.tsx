"use client"; // Necessário para provedores de contexto que usam hooks

import type React from "react";
import type { Metadata } from "next";
import "./globals.css"; // Importe o globals.css da pasta app
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from "@/components/ui/sonner"; // Importe o Toaster
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";


// A exportação de metadados deve ser feita separadamente quando "use client" é usado
// export const metadata: Metadata = { ... };

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <GoogleAnalytics />
        <GoogleOAuthProvider clientId={clientId}>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="light" 
            enableSystem 
            disableTransitionOnChange
          >
            <LoadingProvider>
              <AuthProvider>
                {children}
                <Toaster /> {/* Adicione o Toaster para notificações globais */}
              </AuthProvider>
            </LoadingProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}