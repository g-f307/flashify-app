"use client"

import * as React from "react"
import {
  Bar,
  BarChart as BarPrimitive,
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart as LinePrimitive,
  Pie,
  PieChart as PiePrimitive,
  RadialBar,
  RadialBarChart as RadialBarPrimitive,
  Rectangle,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"

// Chart components
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-h-[200px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke=ccc]]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-radial-bar-sector]:fill-primary [&_.recharts-reference-line_line]:stroke-border [&_.recharts-sector[path_]:focus-visible]:outline-none [&_.recharts-sector[path_]:focus-visible]:ring-2 [&_.recharts-sector[path_]:focus-visible]:ring-ring [&_.recharts-sector[path_]:focus-visible]:ring-offset-2 [&_.recharts-sector[path_]:focus-visible]:ring-offset-background [&_.recharts-surface]:outline-none [&_.recharts-tooltip-cursor]:stroke-dashed",
      className
    )}
    {...props}
  />
))
ChartContainer.displayName = "Chart"

const ChartTooltip = Tooltip

// --- CORREÇÃO APLICADA AQUI ---
// A interface ChartTooltipContentProps foi atualizada para incluir a propriedade 'payload'.
interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
    active?: boolean
    payload?: any // Esta linha foi adicionada
    indicator?: "line" | "dot" | "dashed"
    hideLabel?: boolean
    hideIndicator?: boolean
    nameKey?: string
    labelKey?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      nameKey = "name",
      labelKey = "label",
    },
    ref
  ) => {
    if (!active || !payload || payload.length === 0) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-sm shadow-xl",
          className
        )}
      >
        {!hideLabel ? (
          <div className="font-medium text-muted-foreground">
            {payload[0].payload[labelKey] || payload[0].name}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
            >
              {item.value ? (
                <>
                  {!hideIndicator ? (
                    <div
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px]", {
                        "bg-[--color-fg]": indicator === "dot",
                        "h-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                      })}
                      style={
                        {
                          "--color-fg": item.color,
                        } as React.CSSProperties
                      }
                    />
                  ) : null}
                  <div className="flex flex-1 justify-between leading-none">
                    <span className="text-muted-foreground">
                      {item.name || item.dataKey}
                    </span>
                    <span className="font-medium">
                      {item.value}
                      {item.unit}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-center gap-4", className)}
    {...props}
  />
))
ChartLegend.displayName = "ChartLegend"

const ChartLegendItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    name: string
  }
>(({ className, name, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-1.5 text-sm text-muted-foreground [&>svg]:h-2.5 [&>svg]:w-2.5",
      className
    )}
    {...props}
  >
    {props.children}
    {name}
  </div>
))
ChartLegendItem.displayName = "ChartLegendItem"

const ChartStyle = React.createContext<{
  colors?: string[]
}>({})

function useChart() {
  const context = React.useContext(ChartStyle)

  if (!context) {
    throw new Error("useChart must be used within a <ChartStyle />")
  }

  return context
}

const Chart = ({
  colors,
  ...props
}: React.ComponentProps<typeof ChartContainer> & {
  colors?: string[]
}) => (
  <ChartStyle.Provider value={{ colors }}>
    <ChartContainer {...props} />
  </ChartStyle.Provider>
)

const BarChart = BarPrimitive
const LineChart = LinePrimitive
const PieChart = PiePrimitive
const RadialBarChart = RadialBarPrimitive

export {
  Bar,
  BarChart,
  CartesianGrid,
  Chart,
  ChartContainer,
  ChartLegend,
  ChartLegendItem,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  useChart,
  XAxis,
  YAxis,
}