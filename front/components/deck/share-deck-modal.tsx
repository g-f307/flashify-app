"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { FaWhatsapp, FaXTwitter, FaFacebookF } from "react-icons/fa6";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ShareState = "idle" | "loading" | "success" | "error";

interface ShareDeckModalProps {
  documentId: number;
  documentTitle: string;
  /** Controlled mode: pass open + onOpenChange to drive the dialog from outside */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShareDeckModal({ documentId, documentTitle, open: openProp, onOpenChange: onOpenChangeProp }: ShareDeckModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [state, setState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Support both controlled (from parent) and uncontrolled (self-managed trigger) modes
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      onOpenChangeProp?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const handleCreateShareLink = async () => {
    setState("loading");
    try {
      const result = await apiClient.createShareLink(documentId);
      setShareUrl(result.share_url);
      setState("success");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    if (!open || state !== "idle") return;
    handleCreateShareLink();
  }, [open, state]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!", { description: "Agora você pode compartilhá-lo." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.", {
        description: "Selecione e copie o link manualmente.",
      });
    }
  };

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareToWhatsApp = () => {
    if (!shareUrl) return;
    openShareWindow(
      `https://wa.me/?text=${encodeURIComponent(`Confira este deck no Flashify: ${shareUrl}`)}`
    );
  };

  const handleShareToFacebook = () => {
    if (!shareUrl) return;
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    );
  };

  const handleShareToX = () => {
    if (!shareUrl) return;
    openShareWindow(
      `https://x.com/intent/tweet?text=${encodeURIComponent("Confira este deck no Flashify")}&url=${encodeURIComponent(shareUrl)}`
    );
  };

  const handleShareByEmail = () => {
    if (!shareUrl) return;
    window.location.href =
      `mailto:?subject=${encodeURIComponent("Confira este deck no Flashify")}` +
      `&body=${encodeURIComponent(`Quero compartilhar este deck com você:\n\n${shareUrl}`)}`;
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      // Reset state when closing, but keep shareUrl to allow re-opening
      setTimeout(() => {
        setState("idle");
        setShareUrl(null);
        setCopied(false);
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Only render a built-in trigger when not controlled externally */}
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/60 hover:border-[#48cfea]/50 hover:text-[#48cfea] transition-all duration-200"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#48cfea]" />
            Compartilhar deck
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Compartilhe{" "}
            <span className="font-medium text-foreground">"{documentTitle}"</span> com outras pessoas.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ── LOADING ── */}
          {(state === "idle" || state === "loading") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="py-6 flex flex-col items-center gap-3"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[#48cfea]" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Preparando opções de compartilhamento...
              </p>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {state === "success" && shareUrl && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Deck pronto para compartilhar
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start gap-2" onClick={handleShareToWhatsApp}>
                  <FaWhatsapp className="h-4 w-4 text-[#25D366]" />
                  WhatsApp
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleShareToFacebook}>
                  <FaFacebookF className="h-4 w-4 text-[#1877F2]" />
                  Facebook
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleShareToX}>
                  <FaXTwitter className="h-4 w-4" />
                  X
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={handleShareByEmail}>
                  <Mail className="h-4 w-4 text-[#48cfea]" />
                  Email
                </Button>
              </div>

              <div className="space-y-2">
                <Button
                  className={cn(
                    "w-full font-semibold transition-all duration-300",
                    copied
                      ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-[#FACC15] text-black hover:bg-[#FACC15]/90"
                  )}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4" />Link copiado</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />Copiar link</>
                  )}
                </Button>
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-xs bg-muted/50 border-border/50 cursor-text select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Não foi possível gerar o link agora. Tente novamente.
                </p>
              </div>
              <Button
                className="w-full bg-[#48cfea] hover:bg-[#48cfea]/90 text-black font-semibold"
                onClick={handleCreateShareLink}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
