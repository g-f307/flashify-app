"use client"; // Necessário para provedores de contexto que usam hooks

import type React from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Suspense } from "react";
import "./globals.css"; // Importe o globals.css da pasta app
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from "@/components/ui/sonner"; // Importe o Toaster

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

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
      <body className={`font-sans ${dmSans.variable} antialiased`}>
        <GoogleOAuthProvider clientId={clientId}>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="light" 
            enableSystem 
            disableTransitionOnChange
          >
            <AuthProvider>
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
              <Toaster /> {/* Adicione o Toaster para notificações globais */}
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}