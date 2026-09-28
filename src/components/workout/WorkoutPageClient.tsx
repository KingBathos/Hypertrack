"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { LogoutButton } from "@/components/ui/logout-button";
import { WorkoutSelector } from "@/components/workout/WorkoutSelector";
import { WorkoutTracker } from "@/components/workout/WorkoutTracker";
import type { WorkoutType } from "@/types/workout";

// ──────────────────────────────────────────────────
// WorkoutPageClient — Client Component
// Recibe userId como prop desde el Server Component wrapper
// ──────────────────────────────────────────────────

interface WorkoutState {
  active: boolean;
  type: WorkoutType;
  routineName?: string;
  exercises?: string[];
}

interface WorkoutPageClientProps {
  userId: string;
}

export function WorkoutPageClient({ userId }: WorkoutPageClientProps) {
  const [workout, setWorkout] = useState<WorkoutState>({
    active: false,
    type: "FREE",
  });

  const handleStartWorkout = (
    type: WorkoutType,
    routineName?: string,
    exercises?: string[]
  ) => {
    setWorkout({ active: true, type, routineName, exercises });
  };

  const handleBack = () => {
    setWorkout({ active: false, type: "FREE" });
  };

  const handleSaved = () => {
    setWorkout({ active: false, type: "FREE" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Fondo decorativo (mismo patrón que dashboard) ── */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none fixed -top-60 -right-60 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-60 -left-60 h-[500px] w-[500px] rounded-full bg-emerald-500/4 blur-3xl" />

      {/* ── Layout ── */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {/* Navbar */}
        <header className="mb-8 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
            >
              Dashboard
            </a>
            <a
              href="/nutrition"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
            >
              Nutrición
            </a>
            <LogoutButton variant="icon" />
          </div>
        </header>

        {/* Contenido: Selector o Tracker */}
        <main>
          {!workout.active ? (
            <WorkoutSelector onStartWorkout={handleStartWorkout} />
          ) : (
            <WorkoutTracker
              userId={userId}
              workoutType={workout.type}
              routineName={workout.routineName}
              preloadedExercises={workout.exercises}
              onBack={handleBack}
              onSaved={handleSaved}
            />
          )}
        </main>
      </div>
    </div>
  );
}
