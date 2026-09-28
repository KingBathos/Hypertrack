"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ──────────────────────────────────────────────────
// VolumeChart — Gráfico de Sobrecarga Progresiva
// Muestra el volumen total de carga (kg) por día
// ──────────────────────────────────────────────────

interface VolumeDataPoint {
  date: string;
  volume: number;
  sets: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: VolumeDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  // Formatear la fecha para el tooltip
  const formattedDate = new Date(data.date + "T12:00:00Z").toLocaleDateString(
    "es-PE",
    { weekday: "short", day: "numeric", month: "short" }
  );

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/90 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-1 text-xs font-medium text-zinc-400">{formattedDate}</p>
      <p className="text-lg font-black text-white">
        {data.volume.toLocaleString()} <span className="text-xs font-normal text-zinc-500">kg</span>
      </p>
      <p className="text-xs text-zinc-500">
        {data.sets} {data.sets === 1 ? "serie" : "series"} completadas
      </p>
    </div>
  );
}

export function VolumeChart() {
  const [data, setData] = useState<VolumeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVolume() {
      try {
        const res = await fetch("/api/analytics/volume");
        if (!res.ok) throw new Error("Error al cargar datos");
        const json = await res.json();
        setData(json.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchVolume();
  }, []);

  // Empty state
  if (!loading && data.length === 0 && !error) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 p-8 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="relative z-10 text-center">
          <h3 className="mb-2 text-lg font-bold text-white">
            Sobrecarga Progresiva
          </h3>
          <p className="text-sm text-zinc-500">
            Completa tu primer entrenamiento para ver tu progreso de volumen
            aquí.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-zinc-950/50 p-6 backdrop-blur-xl">
        <p className="text-sm text-red-400">Error: {error}</p>
      </div>
    );
  }

  // Formatear labels del eje X
  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-500/30">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Sobrecarga Progresiva
            </h3>
            <p className="text-xs text-zinc-500">
              Volumen total de carga (kg) por sesión — Últimos 30 días
            </p>
          </div>
          {data.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-black text-white">
                {data[data.length - 1].volume.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  kg
                </span>
              </p>
              <p className="text-xs text-zinc-500">última sesión</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex h-70 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="volumeGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="lineGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                }
                dx={-5}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "rgba(6, 182, 212, 0.2)",
                  strokeWidth: 1,
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="url(#lineGradient)"
                strokeWidth={2.5}
                fill="url(#volumeGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#06b6d4",
                  stroke: "#0e1117",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
