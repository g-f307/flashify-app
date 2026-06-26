"use client";

import { CreationWizard } from "@/components/creation-wizard";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";

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
      <div className="flex flex-col items-start gap-1.5 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACC15]/12 dark:bg-[#FACC15]/10">
            <Sparkles className="w-5 h-5 text-[#FACC15]" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Criar Novo Deck
            </h2>
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mt-1 pl-[52px]">
          Escolha como quer criar os seus materiais de estudo: a partir de um arquivo, imagem ou simplesmente digitando um texto.
        </p>
      </div>
      
      <CreationWizard
        onCreationSuccess={handleCreationSuccess}
        folderId={folderId ? parseInt(folderId, 10) : undefined}
      />
    </div>
  );
}