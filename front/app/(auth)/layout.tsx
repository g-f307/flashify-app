// front/app/(auth)/layout.tsx
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Este layout simples garante que as páginas dentro dele
  // não terão a sidebar da aplicação principal.
  return <>{children}</>;
}