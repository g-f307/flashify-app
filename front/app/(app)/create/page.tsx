// front/app/(app)/create/page.tsx
"use client";

import { CreationWizard } from "@/components/creation-wizard";
import { useRouter } from "next/navigation"; // Importar o useRouter

export default function CreatePage() {
  const router = useRouter(); // Inicializar o router

  // 🔽 FUNÇÃO RESTAURADA AQUI 🔽
  // Esta função será chamada pelo CreationWizard quando a criação for bem-sucedida.
  const handleCreationSuccess = () => {
    router.push("/library");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
       <div className="flex flex-col items-start gap-2 mb-8">
        <h1 className="text-2xl lg:text-3sl font-bold tracking-tight">
          Criar Novo Deck de Flashcards
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Escolha como quer criar os seus flashcards: a partir de um ficheiro, imagem ou simplesmente colando um texto.
        </p>
      </div>
      
      {/* 🔽 PROP RESTAURADA AQUI 🔽 */}
      <CreationWizard onCreationSuccess={handleCreationSuccess} />
    </div>
  );
}