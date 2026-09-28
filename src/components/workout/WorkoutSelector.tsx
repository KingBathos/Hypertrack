"use client";

import { useState, useEffect } from "react";
import type { WorkoutType } from "@/types/workout";
import { getUserTemplates } from "@/actions/workout";
import { useRouter } from "next/navigation";

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

function IconZap({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconClipboard({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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

// ──────────────────────────────────────────────────
// Mock de rutinas PPL para visualización
// ──────────────────────────────────────────────────

interface MockRoutine {
  id: string;
  name: string;
  tag: string;
  tagColor: "cyan" | "purple" | "emerald";
  muscleGroup: string;
  exerciseCount: number;
  estimatedMinutes: number;
  exercises: string[];
  emoji: string;
  isAutoProgressed?: boolean;
}

const MOCK_ROUTINES: MockRoutine[] = [
  {
    id: "push-day",
    name: "Push Day",
    tag: "PUSH",
    tagColor: "cyan",
    muscleGroup: "Pecho · Hombros · Tríceps",
    exerciseCount: 6,
    estimatedMinutes: 65,
    exercises: [
      "Press Banca Plano con Barra",
      "Press Inclinado con Mancuernas",
      "Aperturas en Máquina (Pec Deck)",
      "Press Militar con Barra",
      "Elevaciones Laterales",
      "Fondos en Paralelas",
    ],
    emoji: "🏋️",
  },
  {
    id: "pull-day",
    name: "Pull Day",
    tag: "PULL",
    tagColor: "purple",
    muscleGroup: "Espalda · Bíceps · Antebrazos",
    exerciseCount: 6,
    estimatedMinutes: 60,
    exercises: [
      "Dominadas Pronadas",
      "Remo con Barra",
      "Jalón al Pecho (Polea)",
      "Remo en Máquina (Chest Supported)",
      "Curl con Barra Z",
      "Face Pulls",
    ],
    emoji: "💪",
  },
  {
    id: "legs-day",
    name: "Legs Day",
    tag: "LEGS",
    tagColor: "emerald",
    muscleGroup: "Cuádriceps · Isquios · Glúteos",
    exerciseCount: 6,
    estimatedMinutes: 70,
    exercises: [
      "Sentadilla Libre con Barra",
      "Prensa de Piernas 45°",
      "Peso Muerto Rumano",
      "Extensiones de Cuádriceps",
      "Curl Femoral Acostado",
      "Elevación de Pantorrillas",
    ],
    emoji: "🦵",
  },
];

// ──────────────────────────────────────────────────
// Componentes internos
// ──────────────────────────────────────────────────

const TAG_STYLES = {
  cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/25" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/25" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" },
} as const;

const CARD_GLOW = {
  cyan:    "hover:shadow-cyan-500/8",
  purple:  "hover:shadow-purple-500/8",
  emerald: "hover:shadow-emerald-500/8",
} as const;

function RoutineCard({
  routine,
  onSelect,
  index,
}: {
  routine: MockRoutine;
  onSelect: (routine: MockRoutine) => void;
  index: number;
}) {
  const tag = TAG_STYLES[routine.tagColor];
  const glow = CARD_GLOW[routine.tagColor];

  return (
    <button
      onClick={() => onSelect(routine)}
      className={`
        group relative w-full overflow-hidden rounded-2xl border border-zinc-800
        bg-zinc-900/60 p-5 text-left backdrop-blur-sm
        transition-all duration-300 hover:border-zinc-700 hover:shadow-xl ${glow}
        animate-slide-up cursor-pointer
      `}
      style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
    >
      {/* Orbe decorativo */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${tag.bg} blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-50`} />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{routine.emoji}</span>
            <div>
              <h3 className="text-base font-bold text-zinc-100">{routine.name}</h3>
              <p className="text-xs text-zinc-500">{routine.muscleGroup}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {routine.isAutoProgressed && (
              <span className="rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-yellow-500/15 text-yellow-400 border-yellow-500/25 flex items-center gap-1" title="Pesos ajustados inteligentemente por la IA">
                <span>🧠</span> IA
              </span>
            )}
            <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tag.bg} ${tag.text} ${tag.border}`}>
              {routine.tag}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <IconDumbbell className="h-3.5 w-3.5" />
            {routine.exerciseCount} ejercicios
          </span>
          <span className="flex items-center gap-1">
            <IconTarget className="h-3.5 w-3.5" />
            ~{routine.estimatedMinutes} min
          </span>
        </div>

        {/* Lista de ejercicios */}
        <ul className="mb-4 space-y-1.5">
          {routine.exercises.slice(0, 4).map((ex, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`h-1 w-1 shrink-0 rounded-full ${tag.bg.replace("/15", "/60")}`} />
              {ex}
            </li>
          ))}
          {routine.exercises.length > 4 && (
            <li className="text-xs text-zinc-600">
              +{routine.exercises.length - 4} más...
            </li>
          )}
        </ul>

        {/* CTA */}
        <div className={`flex items-center gap-1.5 text-xs font-medium ${tag.text} transition-transform duration-200 group-hover:translate-x-1`}>
          Iniciar esta rutina
          <IconArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────
// WorkoutSelector — Componente principal
// ──────────────────────────────────────────────────

interface WorkoutSelectorProps {
  onStartWorkout: (type: WorkoutType, routineName?: string, exercises?: string[]) => void;
}

export function WorkoutSelector({ onStartWorkout }: WorkoutSelectorProps) {
  const router = useRouter();
  const [hoveredButton, setHoveredButton] = useState<"free" | "program" | null>(null);
  const [routines, setRoutines] = useState<MockRoutine[]>(MOCK_ROUTINES);
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Programas (Hoy)
        const res = await fetch("/api/routines/today");
        if (res.ok) {
          const data = await res.json();
          if (data.routines && data.routines.length > 0) {
            const mapped = data.routines.map((r: any) => ({
              id: r._id,
              name: r.name,
              tag: "PROGRAMA",
              tagColor: "cyan",
              muscleGroup: "Coach",
              exerciseCount: r.exercises?.length || 0,
              estimatedMinutes: 60,
              exercises: r.exercises?.map((e: any) => e.exerciseName) || [],
              emoji: "📋",
              isAutoProgressed: false
            }));
            setRoutines(mapped);
          }
        }

        // Fetch Plantillas del Usuario
        const templates = await getUserTemplates();
        if (templates) {
          setUserTemplates(templates);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRoutineSelect = (routine: MockRoutine) => {
    onStartWorkout("PROGRAM", routine.name, routine.exercises);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="animate-slide-up">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Nivel 8</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-100">
          Nuevo <span className="gradient-text">Entrenamiento</span>
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Elige cómo quieres entrenar hoy. Puedes iniciar un entrenamiento libre o seguir una rutina predefinida.
        </p>
      </div>

      {/* Botones principales */}
      <div className="grid gap-4 sm:grid-cols-2 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0 }}>
        {/* Entrenamiento Libre */}
        <button
          onClick={() => onStartWorkout("FREE")}
          onMouseEnter={() => setHoveredButton("free")}
          onMouseLeave={() => setHoveredButton(null)}
          className={`
            group relative overflow-hidden rounded-2xl border p-6 text-left
            transition-all duration-300 cursor-pointer
            ${hoveredButton === "free"
              ? "border-cyan-500/30 bg-cyan-500/5 shadow-xl shadow-cyan-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
            }
          `}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <IconZap className="h-7 w-7 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-zinc-100">Entrenamiento Libre</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Arma tu propia rutina sobre la marcha. Agrega ejercicios y series como quieras.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-cyan-400 transition-transform duration-200 group-hover:translate-x-1">
                Comenzar ahora
                <IconArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </button>

        {/* Programa de Entrenador */}
        <button
          onClick={() => onStartWorkout("PROGRAM")}
          onMouseEnter={() => setHoveredButton("program")}
          onMouseLeave={() => setHoveredButton(null)}
          className={`
            group relative overflow-hidden rounded-2xl border p-6 text-left
            transition-all duration-300 cursor-pointer
            ${hoveredButton === "program"
              ? "border-emerald-500/30 bg-emerald-500/5 shadow-xl shadow-emerald-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
            }
          `}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <IconClipboard className="h-7 w-7 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-zinc-100">Programa de Entrenador</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Sigue una rutina asignada por tu entrenador con ejercicios preconfigurados.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-transform duration-200 group-hover:translate-x-1">
                Continuar programa
                <IconArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Separador - Programas */}
      <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: "200ms", opacity: 0 }}>
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          {loading ? "Cargando..." : "Programas Asignados"}
        </span>
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* Grid de programas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && routines.length === 0 && (
          <p className="text-sm text-zinc-500 col-span-full text-center py-4">
            No tienes programas asignados por un coach.
          </p>
        )}
        {routines.map((routine: MockRoutine, i: number) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onSelect={handleRoutineSelect}
            index={i + 3}
          />
        ))}
      </div>

      {/* Separador - Plantillas del Usuario */}
      <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: "300ms", opacity: 0 }}>
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Mis Plantillas
        </span>
        <div className="h-px flex-1 bg-linear-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      {/* Grid de Plantillas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && userTemplates.length === 0 && (
          <div className="col-span-full text-center py-6 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <p className="text-sm text-zinc-500 mb-4">No has creado ninguna plantilla aún.</p>
            <button
              onClick={() => router.push("/workout/templates/new")}
              className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              + CREAR MI PRIMERA PLANTILLA
            </button>
          </div>
        )}
        
        {userTemplates.map((tpl: any, i: number) => (
          <RoutineCard
            key={tpl.publicId}
            routine={{
              id: tpl.publicId,
              name: tpl.name,
              tag: "PLANTILLA",
              tagColor: "purple",
              muscleGroup: "Personalizado",
              exerciseCount: tpl.exercises.length,
              estimatedMinutes: tpl.exercises.length * 10,
              exercises: tpl.exercises.map((e: any) => e.exerciseName),
              emoji: "📓"
            }}
            onSelect={(routine: MockRoutine) => onStartWorkout("FREE", routine.name, routine.exercises)}
            index={i + 3}
          />
        ))}

        {userTemplates.length > 0 && (
          <button
            onClick={() => router.push("/workout/templates/new")}
            className="flex items-center justify-center border-2 border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30 rounded-2xl h-full min-h-40 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer font-bold text-sm"
          >
            + CREAR NUEVA PLANTILLA
          </button>
        )}
      </div>
    </div>
  );
}
