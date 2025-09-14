import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

interface InfoCardProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
}

export function InfoCard({ illustration, title, description }: InfoCardProps) {
  return (
    // 🔽 ALTERAÇÃO AQUI: Adicionadas as classes de transição e hover 🔽
    <Card className="text-center h-full flex flex-col p-4 transition-all duration-300 hover:border-primary hover:shadow-lg">
      <CardHeader className="p-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
          {illustration}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex-grow">
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}