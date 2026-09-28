"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

interface CaloriesData {
  date: string;
  calories: number;
}

export default function CaloriesChart({ data, target }: { data: CaloriesData[], target: number }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm border-2 border-dashed border-zinc-800 bg-black uppercase tracking-widest font-bold">
        NO HAY DATOS DE INGESTA
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full md:h-80 bg-black border-2 border-zinc-800 p-4">
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <h3 className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest">INGESTA CALÓRICA VS TARGET</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%" className="relative z-10 mt-6">
        <BarChart data={data} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip 
            cursor={{ fill: '#18181b' }}
            contentStyle={{ backgroundColor: "#000", borderColor: "#3f3f46", borderRadius: "0", fontFamily: "monospace", fontSize: "12px", color: "#fff", textTransform: "uppercase" }}
            itemStyle={{ color: "#fff", fontWeight: "bold" }}
            formatter={(value: any) => [`${value} KCAL`, 'CONSUMIDO']}
            labelStyle={{ color: "#71717a", marginBottom: "4px" }}
          />
          {target > 0 && (
            <ReferenceLine y={target} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={2} label={{ position: 'top', value: 'TARGET', fill: '#dc2626', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }} />
          )}
          <Bar dataKey="calories" fill="#52525b" activeBar={{ fill: "#fff" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
