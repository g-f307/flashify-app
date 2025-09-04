import type React from "react"
import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

export const metadata: Metadata = {
  title: "Flashify - Smart Flashcard Generator",
  description: "Generate flashcards automatically from PDFs, images, or text with AI",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-sans ${dmSans.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>
              {children}
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
