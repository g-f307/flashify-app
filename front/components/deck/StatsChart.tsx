// front/components/deck/StatsChart.tsx

"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useTheme } from "next-themes";

// Adicionamos a propriedade 'fill' para a cor da barra
interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface StatsChartProps {
  data: ChartData[];
}

export function StatsChart({ data }: StatsChartProps) {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                    dataKey="name"
                    stroke={isDarkMode ? "#888888" : "#555555"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke={isDarkMode ? "#888888" : "#555555"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                    cursor={{ fill: isDarkMode ? 'rgba(120, 120, 120, 0.1)' : 'rgba(200, 200, 200, 0.2)' }}
                    contentStyle={{
                        background: isDarkMode ? 'hsl(var(--background))' : '#ffffff',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                    }}
                    labelStyle={{
                        color: isDarkMode ? 'hsl(var(--foreground))' : '#000000',
                    }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {/* Itera sobre os dados para aplicar a cor específica de cada barra */}
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}