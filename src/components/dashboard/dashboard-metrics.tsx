"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardCachePublic, CachePeriod } from "@/types/dashboard";

// ──────────────────────────────────────────────────
// Iconos SVG inline
// ──────────────────────────────────────────────────

function IconDumbbell({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="2" height="12" rx="1" />
      <rect x="18" y="6" width="2" height="12" rx="1" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="15" x2="18" y2="15" />
      <line x1="2.5" y1="8.5" x2="4" y2="8.5" />
      <line x1="20" y1="8.5" x2="21.5" y2="8.5" />
      <line x1="2.5" y1="15.5" x2="4" y2="15.5" />
      <line x1="20" y1="15.5" x2="21.5" y2="15.5" />
    </svg>
  );
}

function IconFlame({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconActivity({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconTarget({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconRefresh({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ──────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────

const PERIOD_LABELS: Record<CachePeriod, string> = {
  DAILY: "Hoy",
  WEEKLY: "Esta semana",
  MONTHLY: "Este mes",
  LIFETIME: "Total",
};

/** Barra de progreso animada */
function AdherenceBar({ value, color = "cyan" }: { value: number; color?: "cyan" | "emerald" }) {
  const clamp = Math.min(Math.max(value, 0), 100);
  const gradMap = { cyan: "from-cyan-500 to-cyan-400", emerald: "from-emerald-500 to-emerald-400" };
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${gradMap[color]} transition-all duration-1000 ease-out`}
          style={{ width: `${clamp}%` }}
        />
      </div>
      <span className={`w-10 text-right text-sm font-semibold tabular-nums ${clamp >= 80 ? "text-emerald-400" : clamp >= 50 ? "text-amber-400" : "text-red-400"}`}>
        {clamp}%
      </span>
    </div>
  );
}

/** Tarjeta de métrica */
function MetricCard({
  icon,
  label,
  value,
  unit,
  accent = "cyan",
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  accent?: "cyan" | "emerald" | "purple" | "amber";
  sub?: string;
}) {
  const accentMap = {
    cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
    purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400" },
  };
  const a = accentMap[accent];

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-5 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-500/30`}>
      <div className={`pointer-events-none absolute -left-4 -top-4 h-16 w-16 rounded-full ${a.bg} blur-xl`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums text-zinc-100">{value}</span>
            {unit && <span className="text-sm font-medium text-zinc-400">{unit}</span>}
          </p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${a.bg} border ${a.border}`}>
          <div className={`h-6 w-6 ${a.text}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// DashboardMetrics — Componente principal
// Usa campos del $jsonSchema real: trainingMetrics / nutritionMetrics
// ──────────────────────────────────────────────────

interface DashboardMetricsProps {
  userId: string;
  displayName?: string;
}

export function DashboardMetrics({ userId, displayName = "Atleta" }: DashboardMetricsProps) {
  const [period, setPeriod] = useState<CachePeriod>("WEEKLY");
  const [data, setData] = useState<DashboardCachePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<"HIT" | "MISS" | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = useCallback(
    async (p: CachePeriod) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/cache?userId=${userId}&period=${p}`, { cache: "no-store" });
        setCacheStatus(res.headers.get("X-Cache") as "HIT" | "MISS" | null);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Error al cargar métricas");
        }
        const json = await res.json();
        setData(json.data);
        setLastRefresh(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => { fetchMetrics(period); }, [period, fetchMetrics]);

  const refreshLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : null;

  const training  = data?.trainingMetrics  ?? { workoutsCompleted: 0, totalVolumeKg: 0, adherencePercentage: 0 };
  const nutrition = data?.nutritionMetrics ?? { averageCalories: 0, adherencePercentage: 0 };

  const hasData = training.workoutsCompleted > 0 || nutrition.averageCalories > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Bienvenido de vuelta</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de período */}
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            {(["DAILY", "WEEKLY", "MONTHLY", "LIFETIME"] as CachePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  period === p
                    ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 shadow-inner"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchMetrics(period)}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-500 transition-all hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-40"
            aria-label="Actualizar"
          >
            <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Estado caché */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span className={`h-1.5 w-1.5 rounded-full ${cacheStatus === "HIT" ? "bg-emerald-500" : cacheStatus === "MISS" ? "bg-amber-500" : "bg-zinc-600"}`} />
        {cacheStatus === "HIT" && "Desde caché"}
        {cacheStatus === "MISS" && "Calculado en tiempo real"}
        {refreshLabel && ` · ${refreshLabel}`}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-800/40" />
          ))}
        </div>
      )}

      {/* Datos */}
      {!loading && data && (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              icon={<IconDumbbell className="h-full w-full" />}
              label="Entrenamientos"
              value={training.workoutsCompleted}
              accent="cyan"
              sub={PERIOD_LABELS[period]}
            />
            <MetricCard
              icon={<IconActivity className="h-full w-full" />}
              label="Volumen Total"
              value={training.totalVolumeKg.toLocaleString("es-PE")}
              unit="kg"
              accent="purple"
            />
            <MetricCard
              icon={<IconFlame className="h-full w-full" />}
              label="Calorías Prom."
              value={nutrition.averageCalories.toLocaleString("es-PE")}
              unit="kcal"
              accent="amber"
            />
            <MetricCard
              icon={<IconTarget className="h-full w-full" />}
              label="Adherencia"
              value={training.adherencePercentage}
              unit="%"
              accent="emerald"
            />
          </div>

          {/* Tarjetas de adherencia */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Entrenamiento */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Adherencia al Plan
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <IconDumbbell className="h-4 w-4 text-cyan-400" />
                      Entrenamiento
                    </span>
                    <span className="text-xs text-zinc-500">{training.workoutsCompleted} sesiones</span>
                  </div>
                  <AdherenceBar value={training.adherencePercentage} color="cyan" />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <IconFlame className="h-4 w-4 text-amber-400" />
                      Nutrición
                    </span>
                    <span className="text-xs text-zinc-500">Días registrados</span>
                  </div>
                  <AdherenceBar value={nutrition.adherencePercentage} color="emerald" />
                </div>
              </div>
            </div>

            {/* Resumen nutricional */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Resumen Nutricional
              </p>

              {/* Anillo calórico */}
              <div className="flex items-center gap-6">
                <div className="relative h-28 w-28 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="url(#calGrad)" strokeWidth="3"
                      strokeDasharray={`${hasData ? Math.min(75, nutrition.adherencePercentage) : 0} 100`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-bold tabular-nums text-zinc-100">
                      {hasData ? nutrition.averageCalories.toLocaleString("es-PE") : "—"}
                    </span>
                    <span className="text-[9px] text-zinc-500">kcal/día</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  <div className="rounded-xl bg-zinc-800/50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Calorías promedio diarias</p>
                    <p className="text-base font-bold tabular-nums text-zinc-200">
                      {nutrition.averageCalories > 0
                        ? `${nutrition.averageCalories.toLocaleString("es-PE")} kcal`
                        : "Sin datos"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-800/50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Adherencia nutricional</p>
                    <p className={`text-base font-bold ${nutrition.adherencePercentage >= 80 ? "text-emerald-400" : nutrition.adherencePercentage >= 50 ? "text-amber-400" : "text-zinc-200"}`}>
                      {nutrition.adherencePercentage}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-800/50 px-3 py-2">
                    <p className="text-xs text-zinc-500">Volumen de entrenamiento</p>
                    <p className="text-base font-bold text-zinc-200">
                      {training.totalVolumeKg > 0
                        ? `${training.totalVolumeKg.toLocaleString("es-PE")} kg`
                        : "Sin datos"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estado vacío */}
          {!hasData && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-8 py-10 text-center">
              <p className="text-4xl">🏋️</p>
              <p className="mt-3 text-base font-semibold text-zinc-300">
                Sin actividad registrada {PERIOD_LABELS[period].toLowerCase()}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Registra tu primera sesión de entrenamiento o comida para ver tus métricas aquí.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
