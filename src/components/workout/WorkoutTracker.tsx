"use client";
// IDE refresh trigger

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { WeightUnit } from "@/types/workout";
import { logWorkoutSession } from "@/actions/workout";

// ──────────────────────────────────────────────────
// Iconos SVG inline
// ──────────────────────────────────────────────────

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

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

function IconChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ──────────────────────────────────────────────────
// Tipos locales del tracker
// ──────────────────────────────────────────────────

interface TrackerSet {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

interface TrackerExercise {
  id: string;
  name: string;
  sets: TrackerSet[];
  collapsed: boolean;
}

// ──────────────────────────────────────────────────
// Utilidades
// ──────────────────────────────────────────────────

let _idCounter = 0;
function uniqueId(): string {
  return `t_${Date.now()}_${++_idCounter}`;
}

function createEmptySet(): TrackerSet {
  return { id: uniqueId(), reps: "", weight: "", completed: false };
}

function createEmptyExercise(name = ""): TrackerExercise {
  return {
    id: uniqueId(),
    name,
    sets: [createEmptySet()],
    collapsed: false,
  };
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────

/** Fila de un set individual */
function SetRow({
  set,
  index,
  unit,
  onUpdate,
  onRemove,
  onToggleComplete,
  canRemove,
}: {
  set: TrackerSet;
  index: number;
  unit: WeightUnit;
  onUpdate: (id: string, field: "reps" | "weight", value: string) => void;
  onRemove: (id: string) => void;
  onToggleComplete: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div
      className={`
        flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200
        ${set.completed
          ? "bg-emerald-500/5 border border-emerald-500/15"
          : "bg-zinc-800/30 border border-transparent hover:border-zinc-700/50"
        }
      `}
    >
      {/* # Serie */}
      <span className="w-8 text-center text-xs font-bold tabular-nums text-zinc-500">
        {index + 1}
      </span>

      {/* Peso */}
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={set.weight}
          onChange={(e) => onUpdate(set.id, "weight", e.target.value)}
          className={`
            w-full rounded-lg border bg-zinc-900/60 px-3 py-2 text-sm tabular-nums text-zinc-100
            placeholder:text-zinc-700 outline-none transition-all
            ${set.completed
              ? "border-emerald-500/20 text-emerald-300"
              : "border-zinc-700/40 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            }
          `}
          disabled={set.completed}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-600">
          {unit.toLowerCase()}
        </span>
      </div>

      {/* Reps */}
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={set.reps}
          onChange={(e) => onUpdate(set.id, "reps", e.target.value)}
          className={`
            w-full rounded-lg border bg-zinc-900/60 px-3 py-2 text-sm tabular-nums text-zinc-100
            placeholder:text-zinc-700 outline-none transition-all
            ${set.completed
              ? "border-emerald-500/20 text-emerald-300"
              : "border-zinc-700/40 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            }
          `}
          disabled={set.completed}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-600">
          reps
        </span>
      </div>

      {/* Completar */}
      <button
        onClick={() => onToggleComplete(set.id)}
        className={`
          flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer
          ${set.completed
            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
            : "border-zinc-700/50 bg-zinc-800/50 text-zinc-600 hover:border-cyan-500/30 hover:text-cyan-400"
          }
        `}
        aria-label={set.completed ? "Desmarcar serie" : "Completar serie"}
      >
        <IconCheck className="h-4 w-4" />
      </button>

      {/* Eliminar */}
      {canRemove && (
        <button
          onClick={() => onRemove(set.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          aria-label="Eliminar serie"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Tarjeta de ejercicio */
function ExerciseCard({
  exercise,
  exerciseIndex,
  unit,
  onUpdateName,
  onUpdateSet,
  onRemoveSet,
  onToggleSetComplete,
  onAddSet,
  onRemoveExercise,
  onToggleCollapse,
  canRemoveExercise,
}: {
  exercise: TrackerExercise;
  exerciseIndex: number;
  unit: WeightUnit;
  onUpdateName: (id: string, name: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: "reps" | "weight", value: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onToggleSetComplete: (exerciseId: string, setId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveExercise: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  canRemoveExercise: boolean;
}) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;

  return (
    <div
      className="animate-slide-up overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700/80"
      style={{ animationDelay: `${exerciseIndex * 80}ms`, opacity: 0 }}
    >
      {/* Header del ejercicio */}
      <div className="flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3">
        <button
          onClick={() => onToggleCollapse(exercise.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
        >
          <IconChevronDown className={`h-4 w-4 transition-transform duration-200 ${exercise.collapsed ? "-rotate-90" : ""}`} />
        </button>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-xs font-bold text-cyan-400">{exerciseIndex + 1}</span>
        </div>

        <input
          type="text"
          value={exercise.name}
          onChange={(e) => onUpdateName(exercise.id, e.target.value)}
          placeholder="Nombre del ejercicio..."
          className="flex-1 bg-transparent text-sm font-semibold text-zinc-100 placeholder:text-zinc-600 outline-none"
        />

        {/* Progress badge */}
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold tabular-nums ${
          completedSets === totalSets && totalSets > 0
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-zinc-800 text-zinc-500"
        }`}>
          {completedSets}/{totalSets}
        </span>

        {canRemoveExercise && (
          <button
            onClick={() => onRemoveExercise(exercise.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
            aria-label="Eliminar ejercicio"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sets */}
      {!exercise.collapsed && (
        <div className="px-4 py-3">
          {/* Header de columnas */}
          <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            <span className="w-8 text-center">Set</span>
            <span className="flex-1">Peso</span>
            <span className="flex-1">Reps</span>
            <span className="w-8" />
            <span className="w-8" />
          </div>

          {/* Lista de sets */}
          <div className="flex flex-col gap-1.5">
            {exercise.sets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                unit={unit}
                onUpdate={(setId, field, value) => onUpdateSet(exercise.id, setId, field, value)}
                onRemove={(setId) => onRemoveSet(exercise.id, setId)}
                onToggleComplete={(setId) => onToggleSetComplete(exercise.id, setId)}
                canRemove={exercise.sets.length > 1}
              />
            ))}
          </div>

          {/* Agregar serie */}
          <button
            onClick={() => onAddSet(exercise.id)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700/50 py-2 text-xs font-medium text-zinc-500 hover:border-cyan-500/30 hover:text-cyan-400 transition-all cursor-pointer"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Agregar Serie
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// WorkoutTracker — Componente principal
// ──────────────────────────────────────────────────

interface WorkoutTrackerProps {
  userId: string;
  workoutType: "FREE" | "PROGRAM";
  routineName?: string;
  preloadedExercises?: string[];
  onBack: () => void;
  onSaved: () => void;
}

export function WorkoutTracker({
  userId,
  workoutType,
  routineName,
  preloadedExercises,
  onBack,
  onSaved,
}: WorkoutTrackerProps) {
  // Estado
  const startedAtRef = useRef(new Date().toISOString());
  const [sessionName, setSessionName] = useState(routineName || "Entrenamiento Libre");
  const [unit, setUnit] = useState<WeightUnit>("KG");
  const [exercises, setExercises] = useState<TrackerExercise[]>(() => {
    if (preloadedExercises?.length) {
      return preloadedExercises.map((name) => createEmptyExercise(name));
    }
    return [createEmptyExercise()];
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handlers de ejercicios
  const addExercise = useCallback(() => {
    setExercises((prev) => [...prev, createEmptyExercise()]);
  }, []);

  const removeExercise = useCallback((id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }, []);

  const updateExerciseName = useCallback((id: string, name: string) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, name } : ex)));
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, collapsed: !ex.collapsed } : ex)));
  }, []);

  // Handlers de sets
  const addSet = useCallback((exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: [...ex.sets, createEmptySet()] } : ex
      )
    );
  }, []);

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
      )
    );
  }, []);

  const updateSet = useCallback((exerciseId: string, setId: string, field: "reps" | "weight", value: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );
  }, []);

  const toggleSetComplete = useCallback((exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed: !s.completed } : s)),
            }
          : ex
      )
    );
  }, []);

  // Resumen de estadísticas
  const stats = (() => {
    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        totalSets++;
        if (s.completed) {
          completedSets++;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps) || 0;
          totalVolume += w * r;
        }
      }
    }
    return { totalSets, completedSets, totalVolume, exerciseCount: exercises.length };
  })();

  // Guardar sesión
  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);

    try {
      // Validar que hay al menos un ejercicio con nombre y set con datos
      const validExercises = exercises.filter(
        (ex) => ex.name.trim() && ex.sets.some((s) => s.reps && s.weight)
      );

      if (validExercises.length === 0) {
        setSaveError("Agrega al menos un ejercicio con peso y repeticiones.");
        setSaving(false);
        return;
      }

      const finishedAt = new Date().toISOString();

      const payload = {
        userId,
        type: workoutType,
        name: sessionName.trim() || "Entrenamiento",
        exercises: validExercises.map((ex) => ({
          exerciseName: ex.name.trim(),
          sets: ex.sets
            .filter((s) => s.reps && s.weight)
            .map((s, i) => ({
              setNumber: i + 1,
              reps: parseInt(s.reps) || 0,
              weight: parseFloat(s.weight) || 0,
              unit,
            })),
        })),
        notes: notes.trim() || undefined,
        startedAt: startedAtRef.current,
        finishedAt,
      };

      const res = await logWorkoutSession(payload);

      if (!res.success) {
        throw new Error("Error al guardar la sesión");
      }

      setSaveSuccess(true);
      setTimeout(() => onSaved(), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  // ── Pantalla de éxito ──
  if (saveSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 animate-slide-up">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25">
          <IconCheck className="h-10 w-10 text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-zinc-100">¡Sesión Guardada!</h3>
          <p className="mt-2 text-sm text-zinc-500">
            {stats.exerciseCount} ejercicios · {stats.completedSets} series · {Math.round(stats.totalVolume).toLocaleString("es-PE")} {unit.toLowerCase()} de volumen
          </p>
          <p className="mt-1 text-xs text-zinc-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // ── UI principal ──
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-all cursor-pointer"
            aria-label="Volver"
          >
            <IconArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-transparent text-lg font-bold text-zinc-100 outline-none placeholder:text-zinc-600"
              placeholder="Nombre de la sesión..."
            />
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                workoutType === "FREE"
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}>
                {workoutType === "FREE" ? "Libre" : "Programa"}
              </span>
            </div>
          </div>
        </div>

        {/* Timer + Stats */}
        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            <IconClock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold tabular-nums text-zinc-100">{formatTimer(elapsed)}</span>
          </div>

          {/* Unit toggle */}
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-0.5">
            {(["KG", "LBS"] as WeightUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  unit === u
                    ? "bg-linear-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-300 shadow-inner"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: "80ms", opacity: 0 }}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Ejercicios</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">{stats.exerciseCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Series</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">
            <span className="text-emerald-400">{stats.completedSets}</span>
            <span className="text-zinc-600">/{stats.totalSets}</span>
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Volumen</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-100">
            {stats.totalVolume > 0 ? Math.round(stats.totalVolume).toLocaleString("es-PE") : "—"}
            <span className="text-xs text-zinc-500 ml-1">{unit.toLowerCase()}</span>
          </p>
        </div>
      </div>

      {/* Lista de ejercicios */}
      <div className="flex flex-col gap-3">
        {exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={i}
            unit={unit}
            onUpdateName={updateExerciseName}
            onUpdateSet={updateSet}
            onRemoveSet={removeSet}
            onToggleSetComplete={toggleSetComplete}
            onAddSet={addSet}
            onRemoveExercise={removeExercise}
            onToggleCollapse={toggleCollapse}
            canRemoveExercise={exercises.length > 1}
          />
        ))}
      </div>

      {/* Agregar ejercicio */}
      <button
        onClick={addExercise}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700/50 py-4 text-sm font-medium text-zinc-500 hover:border-cyan-500/30 hover:text-cyan-400 transition-all cursor-pointer"
      >
        <IconDumbbell className="h-5 w-5" />
        Agregar Ejercicio
      </button>

      {/* Notas */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
        <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sensaciones, ajustes, observaciones..."
          maxLength={1000}
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-700/40 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
        />
        <p className="mt-1.5 text-right text-[10px] text-zinc-700">{notes.length}/1000</p>
      </div>

      {/* Error */}
      {saveError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {/* Botón guardar */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={saving}
        onClick={handleSave}
        disabled={stats.exerciseCount === 0}
      >
        <IconCheck className="h-5 w-5" />
        Terminar y Guardar Rutina
      </Button>
    </div>
  );
}
