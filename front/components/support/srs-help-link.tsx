"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SrsHelpLinkProps {
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
}

export function SrsHelpLink({
  className,
  iconClassName,
  ariaLabel = "Saiba mais sobre SRS e revisão inteligente",
}: SrsHelpLinkProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-5 w-5 text-muted-foreground hover:text-[#48cfea]", className)}
      asChild
    >
      <Link href="/support/saiba-mais/revisao-inteligente" aria-label={ariaLabel}>
        <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
      </Link>
    </Button>
  );
}
