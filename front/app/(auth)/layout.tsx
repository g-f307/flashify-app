export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // 🔽 CÓDIGO RESTAURADO AQUI 🔽
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      {children}
    </main>
  );
}