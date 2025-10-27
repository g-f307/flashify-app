"use client"; 

import type React from "react";
import type { Metadata } from "next";
import "./globals.css"; 
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from "@/components/ui/sonner"; 
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

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
                <Toaster /> 
              </AuthProvider>
            </LoadingProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}