"use client";

import Image from "next/image";
import type { FlashinhoExpressionVariant } from "@/lib/flashinho-expression";
import { getFlashinhoExpressionSrc } from "@/lib/flashinho-expression";
import { cn } from "@/lib/utils";

interface FlashinhoExpressionProps {
  variant: FlashinhoExpressionVariant;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
}

export function FlashinhoExpression({
  variant,
  alt,
  className,
  imageClassName,
  sizes = "64px",
  priority = false,
}: FlashinhoExpressionProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden", className)}>
      <Image
        src={getFlashinhoExpressionSrc(variant)}
        alt={alt}
        fill
        sizes={sizes}
        className={cn("object-contain", imageClassName)}
        priority={priority}
      />
    </div>
  );
}
