"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts"
import {
    ChartTooltipContent,
  } from "@/components/ui/chart"

interface ResultsChartProps {
    data: { name: string; votes: number }[];
}

export function ResultsChart({ data }: ResultsChartProps) {
    return (
        <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} 
                        content={<ChartTooltipContent />} 
                    />
                    <Bar 
                        dataKey="votes" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                    >
                        <LabelList dataKey="votes" position="top" offset={10} className="fill-foreground" fontSize={12} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}