"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, RadialBarChart, RadialBar, Legend
} from "recharts";

// ──────────────────────────────────────────────────
// Macro Adherence Radial Chart
// ──────────────────────────────────────────────────

interface MacroData {
  name: string;
  consumed: number;
  target: number;
  fill: string;
}

export function MacroRadialChart({ data }: { data: MacroData[] }) {
  const chartData = data.map(d => ({
    name: d.name,
    value: d.target > 0 ? Math.min(Math.round((d.consumed / d.target) * 100), 150) : 0,
    fill: d.fill,
    consumed: d.consumed,
    target: d.target
  }));

  if (chartData.every(d => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm border-2 border-dashed border-zinc-800 bg-black uppercase tracking-widest font-bold">
        SIN DATOS DE ADHERENCIA
      </div>
    );
  }

  return (
    <div className="relative h-72 w-full bg-black border-2 border-zinc-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="25%"
          outerRadius="90%"
          data={chartData}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: "#18181b" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#000",
              borderColor: "#3f3f46",
              borderRadius: "0",
              fontFamily: "monospace",
              fontSize: "11px",
              color: "#fff",
              textTransform: "uppercase" as const
            }}
            formatter={(_: any, __: any, props: any) => {
              const d = props.payload;
              return [`${d.consumed}g / ${d.target}g (${d.value}%)`, d.name];
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Legend below chart */}
      <div className="flex justify-center gap-6 -mt-6">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="h-3 w-3" style={{ backgroundColor: d.fill }} />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Enhanced Calories Chart with Macro Stacking
// ──────────────────────────────────────────────────

interface DailyMacroData {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export function MacroStackedChart({ data, calorieTarget }: { data: DailyMacroData[], calorieTarget: number }) {
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
        <h3 className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest">DESGLOSE CALÓRICO DIARIO</h3>
      </div>
      <ResponsiveContainer width="100%" height="100%" className="relative z-10 mt-6">
        <BarChart data={data} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 9, fontFamily: "monospace" }}
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
            contentStyle={{ backgroundColor: "#000", borderColor: "#3f3f46", borderRadius: "0", fontFamily: "monospace", fontSize: "11px", color: "#fff", textTransform: "uppercase" as const }}
            formatter={(value: any, name: string | number | undefined) => {
              const key = String(name ?? "");
              const labels: Record<string, string> = { protein: "PROTEÍNA", carbs: "CARBOS", fats: "GRASAS" };
              return [`${value} KCAL`, labels[key] || key];
            }}
          />
          {calorieTarget > 0 && (
            <ReferenceLine y={calorieTarget} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={2} label={{ position: 'top', value: 'TARGET', fill: '#dc2626', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }} />
          )}
          <Bar dataKey="protein" stackId="a" fill="#ef4444" />
          <Bar dataKey="carbs" stackId="a" fill="#f59e0b" />
          <Bar dataKey="fats" stackId="a" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
