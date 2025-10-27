"use client";

import Link from "next/link";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { FolderWithDocuments } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";

interface FolderCardProps {
  folder: FolderWithDocuments;
  onRename: () => void;
  onDelete: () => void;
}

export function FolderCard({ folder, onRename, onDelete }: FolderCardProps) {
  const deckCount = folder.documents.length;

  return (
    <div className="relative group h-full">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onRename(); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onSelect={(e) => { e.preventDefault(); onDelete(); }}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/library/folder/${folder.id}`} legacyBehavior>
      <a className="block p-4 bg-card rounded-lg border-0 dark:border-0 shadow-none dark:shadow-none hover:shadow-md transition-shadow duration-200 h-full">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Folder className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {folder.name}
              </h3>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {deckCount} {deckCount === 1 ? "deck" : "decks"}
            </p>
          </div>
        </a>
      </Link>
    </div>
  );
}