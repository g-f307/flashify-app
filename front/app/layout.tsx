import type React from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css"; 
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { LoadingProvider } from "@/components/providers/loading-provider";
import { GenerationLimitProvider } from "@/contexts/generation-limit-context";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from "@/components/ui/sonner"; 
import Analytics from "@/components/analytics/Analytics";
import AcquisitionTracker from "@/components/analytics/acquisition-tracker";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const metadata: Metadata = {
  title: {
    default: "Flashify - Aprenda com IA",
    template: "%s | Flashify"
  },
  description: "Transforme seus estudos com flashcards e quizzes gerados por inteligência artificial",
  icons: {
    icon: [
      { url: "/flashify_logo.svg" },
    ],
    apple: [
      { url: "/flashify_logo.svg" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Analytics />
        <AcquisitionTracker />
        <GoogleOAuthProvider clientId={clientId}>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="light" 
            enableSystem 
            disableTransitionOnChange
          >
            <LoadingProvider>
              <AuthProvider>
                <GenerationLimitProvider>
                  {children}
                </GenerationLimitProvider>
                <Toaster /> 
              </AuthProvider>
            </LoadingProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
