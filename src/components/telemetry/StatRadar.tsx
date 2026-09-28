"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

export default function StatRadar({ data }: { data: RadarData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 rounded-xl">
        TELEMETRÍA INSUFICIENTE
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full md:h-80">
      {/* Monolithic UI */}
      
      <ResponsiveContainer width="100%" height="100%" className="relative z-10">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "#d4d4d8", fontSize: 11, fontFamily: "monospace", textAnchor: "middle" }} 
            className="uppercase font-black tracking-widest"
          />
          <Radar
            name="Atributos"
            dataKey="A"
            stroke="#dc2626"
            strokeWidth={3}
            fill="#dc2626"
            fillOpacity={0.6}
            style={{
              filter: "drop-shadow(0px 0px 0px rgba(220,38,38,1))"
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
