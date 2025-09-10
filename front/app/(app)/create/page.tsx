// front/app/(app)/create/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { CreationWizard } from "@/components/creation-wizard";

export default function CreatePage() {
  const router = useRouter();

  const handleCreationSuccess = () => {
    // Após criar o conjunto com sucesso, redireciona para a biblioteca
    router.push("/library");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-8">
      <div className="w-full max-w-4xl">
        <CreationWizard onCreationSuccess={handleCreationSuccess} />
      </div>
    </div>
  );
}