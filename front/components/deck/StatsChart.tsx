"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { useTheme } from "next-themes";

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface StatsChartProps {
  data: ChartData[];
}

function StatsTooltip({
    active,
    payload,
    label,
    isDarkMode,
}: {
    active?: boolean;
    payload?: Array<{ value?: number; payload?: ChartData }>;
    label?: string;
    isDarkMode: boolean;
}) {
    if (!active || !payload?.length) return null;

    const point = payload[0];
    const value = typeof point?.value === "number" ? Math.round(point.value) : 0;
    const color = point?.payload?.fill ?? "#FACC15";

    return (
        <div
            className="min-w-28 rounded-lg border px-3 py-2 shadow-xl"
            style={{
                backgroundColor: isDarkMode ? "hsl(var(--card))" : "#ffffff",
                borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                color: isDarkMode ? "hsl(var(--card-foreground))" : "hsl(var(--foreground))",
            }}
        >
            <p className="text-xs font-medium">{label}</p>
            <div className="mt-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted-foreground">Progresso</span>
                <span className="ml-auto text-sm font-semibold">{value}%</span>
            </div>
        </div>
    );
}

export function StatsChart({ data }: StatsChartProps) {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 6, left: 6, bottom: 0 }} barCategoryGap="26%">
                <CartesianGrid
                    vertical={false}
                    stroke={isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}
                    strokeDasharray="3 3"
                />
                <XAxis
                    dataKey="name"
                    stroke={isDarkMode ? "#888888" : "#555555"}
                    fontSize={11}
                    height={20}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke={isDarkMode ? "#888888" : "#555555"}
                    fontSize={11}
                    width={44}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    ticks={[0, 50, 100]}
                    tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                    cursor={{ fill: isDarkMode ? 'rgba(120, 120, 120, 0.1)' : 'rgba(200, 200, 200, 0.2)' }}
                    content={<StatsTooltip isDarkMode={isDarkMode} />}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={64}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
