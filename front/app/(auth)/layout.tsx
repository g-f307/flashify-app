export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-start justify-center bg-background p-2 sm:p-4 overflow-hidden">
      {children}
    </main>
  );
}