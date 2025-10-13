// front/components/documents/folder-list.tsx
"use client";

import { FolderWithDocuments, Document } from "@/lib/api"; // <-- Use o tipo corrigido
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DocumentList } from "./document-list";
import { Folder as FolderIcon } from "lucide-react";
import { Card } from "@/components/ui/card";   // <-- IMPORTAÇÃO ADICIONADA
import { Badge } from "@/components/ui/badge"; // <-- IMPORTAÇÃO ADICIONADA

interface FolderListProps {
  folders: FolderWithDocuments[]; // <-- Use o tipo corrigido
  onDocumentSelect: (document: Document) => void;
  onUpdate: () => void;
}

export function FolderList({ folders, onDocumentSelect, onUpdate }: FolderListProps) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-xl font-semibold tracking-tight mb-4">Pastas</h3>
      <Accordion type="multiple" className="w-full space-y-4">
        {folders.map((folder) => (
          <AccordionItem value={`folder-${folder.id}`} key={folder.id} className="border-b-0">
            <Card className="overflow-hidden shadow-sm">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 data-[state=open]:border-b">
                <div className="flex items-center gap-3">
                  <FolderIcon className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-lg">{folder.name}</span>
                  <Badge variant="secondary">{folder.documents.length} decks</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-4 bg-muted/20">
                <DocumentList
                  documents={folder.documents}
                  onDocumentSelect={onDocumentSelect}
                  onUpdate={onUpdate}
                  onNewUpload={() => {}} // Não é aplicável aqui
                  isInsideFolder
                />
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}