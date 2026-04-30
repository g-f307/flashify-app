"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play } from "lucide-react";

interface ResumeStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  progressLabel: string;
  secondaryLabel?: string;
  continueLabel?: string;
  restartLabel?: string;
  onContinue: () => void;
  onRestart: () => void;
}

export function ResumeStudyDialog({
  open,
  onOpenChange,
  title = "Continuar estudando?",
  progressLabel,
  secondaryLabel,
  continueLabel = "Continuar de onde parei",
  restartLabel = "Começar do início",
  onContinue,
  onRestart,
}: ResumeStudyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden border-border bg-background p-0 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="p-6 text-center">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary p-4 rounded-full w-16 h-16 mb-4 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground" />
            </div>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
          </DialogHeader>

          <p className="mt-4 text-muted-foreground">{progressLabel}</p>
          {secondaryLabel && (
            <p className="text-sm text-muted-foreground mt-2">{secondaryLabel}</p>
          )}

          <div className="space-y-3 mt-6">
            <Button
              onClick={onContinue}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              {continueLabel}
            </Button>

            <Button
              onClick={onRestart}
              variant="outline"
              className="w-full border-border dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              size="lg"
            >
              {restartLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
