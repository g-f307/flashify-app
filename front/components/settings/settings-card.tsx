"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React from "react";

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({ icon, title, description, children, className }: SettingsCardProps) {
  return (
    <Card className={cn("flex flex-col h-full transition-all duration-300 hover:border-primary/80 hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {children}
      </CardContent>
    </Card>
  );
}