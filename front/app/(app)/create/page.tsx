"use client";

import { CreationWizard } from "@/components/creation-wizard";
import { useRouter, useSearchParams } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Lê o folderId da URL. Ex: /create?folderId=123
  const folderId = searchParams.get("folderId");

  const handleCreationSuccess = () => {
    // Se o deck foi criado dentro de uma pasta, volta para essa pasta.
    // Caso contrário, volta para a biblioteca principal.
    if (folderId) {
      router.push(`/library/folder/${folderId}`);
    } else {
      router.push("/library");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
       <div className="flex flex-col items-start gap-2 mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Criar Novo Deck de Flashcards
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Escolha como quer criar os seus flashcards: a partir de um ficheiro, imagem ou simplesmente colando um texto.
        </p>
      </div>
      
      <CreationWizard
        onCreationSuccess={handleCreationSuccess}
        // Converte o folderId de string para número antes de passar
        folderId={folderId ? parseInt(folderId, 10) : undefined}
      />
    </div>
  );
}