"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WeeklyActivityChartProps {
  data: number[]; 
}

const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

export const WeeklyActivityChart = ({ data }: WeeklyActivityChartProps) => {
  if (!data || data.length !== 7) {
    return (
      <div className="h-60 flex items-center justify-center text-muted-foreground">
        Dados de atividade inválidos.
      </div>
    );
  }

  const maxValue = Math.max(...data, 1); 

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Semanal</CardTitle>
      </CardHeader>
      <CardContent className="h-60 flex items-end justify-around gap-2 md:gap-4 p-4">
        {data.map((value, index) => (
          <div key={index} className="flex flex-col items-center flex-1 h-full">
            <div className="relative w-full h-full flex items-end justify-center group">
              <div className="absolute -top-7 mb-2 w-max px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                {value} {value === 1 ? "card" : "cards"}
              </div>
              
              <div
                className={cn(
                  "w-3/4 rounded-t-lg bg-primary/70 hover:bg-primary/90 transition-all duration-300 ease-in-out",
                  value > 0 ? "min-h-[4px]" : "h-0"
                )}
                style={{ height: `${(value / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground mt-2">{weekDays[index]}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};