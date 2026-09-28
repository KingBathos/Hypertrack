"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface WeightData {
  date: string;
  weight: number;
}

export default function WeightChart({ data }: { data: WeightData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm border-2 border-dashed border-zinc-800 bg-black uppercase tracking-widest font-bold">
        NO HAY DATOS DE PESO
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full md:h-80 bg-black border-2 border-zinc-800 p-4">
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <h3 className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest">TENDENCIA DE PESO</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%" className="relative z-10 mt-6">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }} 
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#000", borderColor: "#dc2626", borderRadius: "0", fontFamily: "monospace", fontSize: "12px", color: "#fff", textTransform: "uppercase" }}
            itemStyle={{ color: "#dc2626", fontWeight: "bold" }}
            formatter={(value: any) => [`${value} KG`, 'PESO']}
            labelStyle={{ color: "#71717a", marginBottom: "4px" }}
          />
          <Line 
            type="stepAfter" 
            dataKey="weight" 
            stroke="#dc2626" 
            strokeWidth={3}
            dot={{ r: 4, fill: "#000", stroke: "#dc2626", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#dc2626", stroke: "#000" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
