import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AnimatedGradientTextProps {
  children: ReactNode;
  className?: string;
}

export default function AnimatedGradientText({
  children,
  className,
}: AnimatedGradientTextProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-[#FFC300] via-[#6BDEF3] to-[#FFC300] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient",
        className
      )}
    >
      {children}
    </div>
  );
}