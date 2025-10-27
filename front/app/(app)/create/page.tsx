"use client";

import { CreationWizard } from "@/components/creation-wizard";
import { useRouter, useSearchParams } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const folderId = searchParams.get("folderId");

  const handleCreationSuccess = () => {
    if (folderId) {
      router.push(`/library/folder/${folderId}`);
    } else {
      router.push("/library");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
       <div className="flex flex-col items-start gap-2 mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
          Criar Novo Deck 
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          Escolha como quer criar os seus materiais para estudo: a partir de um arquivo, imagem ou simplesmente digitando um texto.
        </p>
      </div>
      
      <CreationWizard
        onCreationSuccess={handleCreationSuccess}
        folderId={folderId ? parseInt(folderId, 10) : undefined}
      />
    </div>
  );
}