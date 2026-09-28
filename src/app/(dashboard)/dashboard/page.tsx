import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/mongodb";
import type { UserDocument } from "@/types/user";
import type { ProfileDocument, BodyMeasurementDocument } from "@/types/profile";
import type { ProgramAssignmentDocument } from "@/types/workout";
import type { NutritionPlanDocument } from "@/types/nutrition";
import MealLogger from "@/components/nutrition/MealLogger";
import StatRadar from "@/components/telemetry/StatRadar";
import BiometricsUpdater from "@/components/telemetry/BiometricsUpdater";
import MacroRings from "@/components/telemetry/MacroRings";

export const metadata: Metadata = {
  title: "Dashboard | HyperTrack",
  description: "Tu Hub Central de entrenamiento y nutrición.",
};

export default async function UserDashboard() {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "COACH") redirect("/coach");
  if (session.role === "NUTRITIONIST") redirect("/nutritionist");
  if (session.role === "ADMIN") redirect("/admin");

  const db = await getDb();
  
  // ─────────────────────────────────────────────
  // 1. User & Profile
  // ─────────────────────────────────────────────
  const usersCol = db.collection<UserDocument>("users");
  const user = await usersCol.findOne({ publicId: session.sub });
  if (!user) return null;

  const profilesCol = db.collection<ProfileDocument>("profiles");
  const measurementsCol = db.collection<BodyMeasurementDocument>("body_measurements");
  const programsCol = db.collection<ProgramAssignmentDocument>("program_assignments");
  const nutritionCol = db.collection<NutritionPlanDocument>("nutrition_plans");
  const mealLogsCol = db.collection("meal_logs");
  const workoutSessionsCol = db.collection("workout_sessions");

  const startOfDay = new Date();
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23,59,59,999);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [profile, latestMeasurement, activeProgram, activeNutrition, todayMeals, recentWorkouts] = await Promise.all([
    profilesCol.findOne({ userId: user._id }),
    measurementsCol.find({ userId: user._id }).sort({ date: -1 }).limit(1).toArray(),
    programsCol.findOne({ clientId: user._id, status: "ACTIVE" }),
    nutritionCol.findOne({ clientId: user._id, status: "ACTIVE" }),
    mealLogsCol.find({ userId: user._id, loggedAt: { $gte: startOfDay, $lte: endOfDay } }).toArray(),
    workoutSessionsCol.find({ clientId: user._id, startedAt: { $gte: thirtyDaysAgo } }).sort({ startedAt: -1 }).toArray(),
  ]);

  const measurement = latestMeasurement[0] || null;
  const firstName = profile?.identity?.firstName || "ATLETA";

  // ─────────────────────────────────────────────
  // 2. Program Details
  // ─────────────────────────────────────────────
  let programDetails: any = null;
  if (activeProgram) {
    programDetails = await db.collection("training_programs").findOne({ _id: activeProgram.programVersionId });
  }

  // ─────────────────────────────────────────────
  // 3. Today's Nutrition (consumed)
  // ─────────────────────────────────────────────
  const consumedCalories = todayMeals.reduce((acc, meal) => acc + (meal.nutrition?.calories || meal.calories || 0), 0);
  const consumedProtein = todayMeals.reduce((acc, meal) => acc + (meal.nutrition?.protein || meal.macros?.protein || 0), 0);
  const consumedCarbs = todayMeals.reduce((acc, meal) => acc + (meal.nutrition?.carbs || meal.macros?.carbs || 0), 0);
  const consumedFats = todayMeals.reduce((acc, meal) => acc + (meal.nutrition?.fats || meal.macros?.fats || 0), 0);

  // Nutrition targets
  const targetCalories = (activeNutrition as any)?.targets?.dailyCalories || (activeNutrition as any)?.dailyTargets?.calories || 0;
  const targetProtein = (activeNutrition as any)?.targets?.macros?.protein || (activeNutrition as any)?.dailyTargets?.proteinGrams || 0;
  const targetCarbs = (activeNutrition as any)?.targets?.macros?.carbs || (activeNutrition as any)?.dailyTargets?.carbsGrams || 0;
  const targetFats = (activeNutrition as any)?.targets?.macros?.fats || (activeNutrition as any)?.dailyTargets?.fatsGrams || 0;

  // ─────────────────────────────────────────────
  // 4. HUD Metrics
  // ─────────────────────────────────────────────
  
  // A. Monthly Tonnage (total volume in kg)
  const monthlyTonnage = recentWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);

  // B. Sessions this month
  const totalSessions = recentWorkouts.length;

  // C. Streak — consecutive days with workouts or meals logged (last 30d)
  const activityDays = new Set<string>();
  recentWorkouts.forEach(w => {
    if (w.startedAt) activityDays.add(new Date(w.startedAt).toDateString());
    if (w.audit?.createdAt) activityDays.add(new Date(w.audit.createdAt).toDateString());
  });
  // Also count meal logging days from the last 7 days
  const recentMealLogs = await mealLogsCol.find({ userId: user._id, loggedAt: { $gte: sevenDaysAgo } }).toArray();
  recentMealLogs.forEach(m => {
    if (m.loggedAt) activityDays.add(new Date(m.loggedAt).toDateString());
  });

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDays.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break; // Don't break on day 0 (today might not have activity yet)
    }
  }

  // D. Recovery Status (based on frequency and recency)
  let recoveryStatus = "ÓPTIMO";
  let recoveryColor = "text-green-500";
  let recoveryBorder = "border-green-600/30";
  
  if (totalSessions > 0) {
    const lastWorkout = recentWorkouts[0];
    const lastDate = lastWorkout?.startedAt ? new Date(lastWorkout.startedAt) : (lastWorkout?.audit?.createdAt ? new Date(lastWorkout.audit.createdAt) : null);
    const daysSinceLastWorkout = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    // Weekly frequency
    const weekWorkouts = recentWorkouts.filter(w => {
      const d = w.startedAt ? new Date(w.startedAt) : new Date(w.audit?.createdAt);
      return d >= sevenDaysAgo;
    }).length;

    if (weekWorkouts >= 6) {
      recoveryStatus = "SOBREENTRENADO";
      recoveryColor = "text-red-500";
      recoveryBorder = "border-red-600/30";
    } else if (weekWorkouts >= 5 || daysSinceLastWorkout === 0) {
      recoveryStatus = "FATIGADO";
      recoveryColor = "text-yellow-500";
      recoveryBorder = "border-yellow-600/30";
    } else if (daysSinceLastWorkout > 3) {
      recoveryStatus = "DESCANSADO";
      recoveryColor = "text-blue-400";
      recoveryBorder = "border-blue-600/30";
    }
  }

  // ─────────────────────────────────────────────
  // 5. Last Session Summary
  // ─────────────────────────────────────────────
  let lastSessionSummary: { name: string; date: string; volume: number; exercises: number; timeAgo: string } | null = null;
  if (recentWorkouts.length > 0) {
    const last = recentWorkouts[0];
    const lastDate = last.startedAt ? new Date(last.startedAt) : new Date(last.audit?.createdAt);
    const diffMs = Date.now() - lastDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let timeAgo = "Hace un momento";
    if (diffDays > 0) timeAgo = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    else if (diffHours > 0) timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    lastSessionSummary = {
      name: last.name || last.programName || "SESIÓN",
      date: lastDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      volume: last.totalVolume || 0,
      exercises: last.exercises?.length || 0,
      timeAgo,
    };
  }

  // ─────────────────────────────────────────────
  // 6. Personal Records (PRs)
  // ─────────────────────────────────────────────
  const prRecords: { exercise: string; weight: number; reps: number; date: string }[] = [];
  
  // Extract PRs from recent workouts that have PR markers
  recentWorkouts.forEach(w => {
    (w.exercises || []).forEach((exe: any) => {
      (exe.sets || []).forEach((set: any) => {
        if (set.isPR || set.isPersonalRecord) {
          prRecords.push({
            exercise: exe.exerciseName || "EJERCICIO",
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
            date: (w.startedAt ? new Date(w.startedAt) : new Date(w.audit?.createdAt)).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          });
        }
      });
    });
  });

  // Also get the best set per exercise for the "personal bests" showcase
  const personalBests = new Map<string, { weight: number; reps: number; date: string }>();
  recentWorkouts.forEach(w => {
    (w.exercises || []).forEach((exe: any) => {
      const name = exe.exerciseName || "";
      (exe.sets || []).forEach((set: any) => {
        const weight = Number(set.weight) || 0;
        const current = personalBests.get(name);
        if (!current || weight > current.weight) {
          personalBests.set(name, {
            weight,
            reps: Number(set.reps) || 0,
            date: (w.startedAt ? new Date(w.startedAt) : new Date(w.audit?.createdAt)).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
          });
        }
      });
    });
  });
  const topLifts = Array.from(personalBests.entries())
    .filter(([, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);

  // ─────────────────────────────────────────────
  // 7. Radar Data (Muscular Attributes)
  // ─────────────────────────────────────────────
  const radarMetrics = { Push: 0, Pull: 0, Legs: 0, Core: 0 };
  
  recentWorkouts.forEach(session => {
    (session.exercises || []).forEach((exe: any) => {
      const name = (exe.exerciseName || "").toLowerCase();
      let category = "Core"; // Default
      if (name.includes("press") || name.includes("push") || name.includes("pecho") || name.includes("hombro") || name.includes("tricep")) category = "Push";
      if (name.includes("pull") || name.includes("remo") || name.includes("dominada") || name.includes("espalda") || name.includes("bicep")) category = "Pull";
      if (name.includes("sentadilla") || name.includes("squat") || name.includes("pierna") || name.includes("peso muerto") || name.includes("leg")) category = "Legs";
      
      let volume = 0;
      (exe.sets || []).forEach((s: any) => {
        volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });
      radarMetrics[category as keyof typeof radarMetrics] += volume;
    });
  });

  const maxVolume = Math.max(1000, ...Object.values(radarMetrics)); // Escala dinámica
  const radarData = [
    { subject: 'Push', A: radarMetrics.Push, fullMark: maxVolume },
    { subject: 'Pull', A: radarMetrics.Pull, fullMark: maxVolume },
    { subject: 'Legs', A: radarMetrics.Legs, fullMark: maxVolume },
    { subject: 'Core', A: radarMetrics.Core, fullMark: maxVolume },
  ];

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      
      {/* ── HEADER ── */}
      <header className="mb-8 border-b-4 border-red-600 pb-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
          BIENVENIDO, {firstName}
        </h1>
        <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
          SISTEMA DE HIPERTROFIA ACTIVADO
        </p>
      </header>

      {/* ── HUD BANNER ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {/* Streak */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-4 text-center group hover:border-red-600/50 transition-colors">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">RACHA ACTIVA</p>
          <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors">
            {streak}<span className="text-lg text-zinc-500 ml-1">DÍAS</span>
          </p>
          <div className="flex justify-center gap-0.5 mt-2">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <div key={i} className="h-1.5 w-3 bg-red-600" />
            ))}
            {Array.from({ length: Math.max(0, 7 - streak) }).map((_, i) => (
              <div key={i} className="h-1.5 w-3 bg-zinc-800" />
            ))}
          </div>
        </div>

        {/* Monthly Tonnage */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-4 text-center group hover:border-red-600/50 transition-colors">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">TONELAJE MENSUAL</p>
          <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors">
            {monthlyTonnage > 0 ? `${(monthlyTonnage / 1000).toFixed(1)}` : "—"}<span className="text-lg text-zinc-500 ml-1">TON</span>
          </p>
        </div>

        {/* Sessions */}
        <div className="bg-zinc-950 border-2 border-zinc-800 p-4 text-center group hover:border-red-600/50 transition-colors">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">SESIONES (30D)</p>
          <p className="text-4xl font-black text-white group-hover:text-red-500 transition-colors">{totalSessions}</p>
        </div>

        {/* Recovery Status */}
        <div className={`bg-zinc-950 border-2 ${recoveryBorder} p-4 text-center`}>
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">RECUPERACIÓN</p>
          <p className={`text-2xl font-black ${recoveryColor} uppercase`}>{recoveryStatus}</p>
          {lastSessionSummary && (
            <p className="text-[10px] text-zinc-600 font-mono mt-1">{lastSessionSummary.timeAgo.toUpperCase()}</p>
          )}
        </div>
      </section>

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ═══ PILAR 1: BIOMETRÍA ═══ */}
        <section className="brutalist-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-heading font-black text-white mb-6 uppercase tracking-wider">
              BIOMETRÍA
            </h2>
            
            {measurement ? (
              <div className="space-y-6">
                <div className="border-b-2 border-zinc-800 pb-4">
                  <div className="text-sm text-zinc-500 font-mono uppercase tracking-widest mb-1">PESO CORPORAL</div>
                  <div className="text-5xl font-black text-white">{measurement.weight} <span className="text-xl font-normal text-zinc-500">KG</span></div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-mono uppercase tracking-widest mb-1">GRASA CORPORAL</div>
                  <div className="text-4xl font-bold text-zinc-300">{measurement.bodyFatPercentage || "--"}%</div>
                </div>
              </div>
            ) : profile?.physical?.weightKg ? (
              <div className="space-y-6">
                <div className="border-b-2 border-zinc-800 pb-4">
                  <div className="text-sm text-zinc-500 font-mono uppercase tracking-widest mb-1">PESO (PERFIL)</div>
                  <div className="text-5xl font-black text-white">{profile.physical.weightKg} <span className="text-xl font-normal text-zinc-500">KG</span></div>
                </div>
                <p className="text-xs text-zinc-600 font-mono uppercase">Peso registrado en tu perfil. Actualiza tus mediciones para ver la evolución.</p>
              </div>
            ) : (
              <div className="py-6 text-zinc-500 font-mono uppercase text-sm">
                NO HAY MEDICIONES REGISTRADAS.
              </div>
            )}
          </div>
          <BiometricsUpdater />
        </section>

        {/* ═══ PILAR 2: MOTOR DE ENTRENAMIENTO ═══ */}
        <section className="brutalist-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-heading font-black text-white mb-6 uppercase tracking-wider">
              ENTRENAMIENTO
            </h2>

            {activeProgram && programDetails ? (
              <div className="space-y-4">
                <div className="bg-zinc-950 border border-zinc-800 p-5">
                  <div className="text-xs text-red-500 font-mono uppercase font-bold tracking-widest mb-2">PROGRAMA ACTIVO</div>
                  <div className="font-black text-2xl text-white uppercase leading-tight mb-3">{programDetails.name}</div>
                  
                  {programDetails.exercises && programDetails.exercises.length > 0 && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Ejercicios ({programDetails.exercises.length})</div>
                      <ul className="text-sm text-zinc-300 font-mono space-y-1">
                        {programDetails.exercises.slice(0, 4).map((exe: any, idx: number) => (
                          <li key={idx} className="flex justify-between items-center bg-black p-2 border border-zinc-900">
                            <span className="truncate pr-2">{exe.exerciseName}</span>
                            <span className="text-red-500 font-bold shrink-0">{exe.targetSets}x{exe.targetReps}</span>
                          </li>
                        ))}
                        {programDetails.exercises.length > 4 && (
                          <li className="text-center text-xs text-zinc-500 pt-2">
                            + {programDetails.exercises.length - 4} MÁS...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Last Session Recap */}
                {lastSessionSummary && (
                  <div className="bg-zinc-950 border border-zinc-800 p-4">
                    <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-2">ÚLTIMA BATALLA</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-black text-white uppercase truncate">{lastSessionSummary.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{lastSessionSummary.timeAgo.toUpperCase()} · {lastSessionSummary.exercises} EJERCICIOS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-red-500">{lastSessionSummary.volume > 0 ? `${(lastSessionSummary.volume / 1000).toFixed(1)}T` : "—"}</p>
                        <p className="text-[9px] text-zinc-600 font-mono">VOL. TOTAL</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-zinc-400 font-mono uppercase font-bold pt-2 flex items-center gap-3">
                  <span className="h-3 w-3 bg-red-600 animate-pulse" />
                  LISTO PARA ENTRENAR
                </div>
              </div>
            ) : (
              <div className="py-6 text-zinc-500 font-mono uppercase text-sm">
                SIN PROGRAMA. MODO LIBRE ACTIVADO.
              </div>
            )}
          </div>
          {activeProgram ? (
            <Link href="/workout/live?mode=program" className="brutalist-button mt-8 w-full block text-center p-4 relative overflow-hidden group">
              <span className="relative z-10">INICIAR SESIÓN</span>
              <div className="absolute inset-0 bg-red-700 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            </Link>
          ) : (
            <Link href="/workout/live" className="brutalist-button mt-8 w-full block text-center p-4 bg-zinc-800 hover:bg-zinc-700 text-white relative overflow-hidden group">
              <span className="relative z-10">ENTRENAMIENTO LIBRE</span>
              <div className="absolute inset-0 bg-zinc-600 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
            </Link>
          )}
        </section>

        {/* ═══ PILAR 3: MOTOR METABÓLICO (MACRO RINGS) ═══ */}
        <section className="brutalist-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-heading font-black text-white mb-6 uppercase tracking-wider">
              NUTRICIÓN
            </h2>

            {activeNutrition ? (
              <div className="flex flex-col items-center">
                <MacroRings
                  consumedCalories={consumedCalories}
                  targetCalories={targetCalories}
                  consumedProtein={consumedProtein}
                  targetProtein={targetProtein}
                  consumedCarbs={consumedCarbs}
                  targetCarbs={targetCarbs}
                  consumedFats={consumedFats}
                  targetFats={targetFats}
                />
              </div>
            ) : (
              <div className="py-6 text-zinc-500 font-mono uppercase text-sm">
                NO TIENES PLAN NUTRICIONAL ACTIVO.
              </div>
            )}
            
            <div className="mt-6">
              <MealLogger />
            </div>
          </div>
        </section>

      </main>

      {/* ── TROPHY CASE: PERSONAL RECORDS ── */}
      {topLifts.length > 0 && (
        <section className="mt-8 brutalist-card p-6">
          <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            🏆 SALÓN DE LA FAMA — MEJORES LEVANTAMIENTOS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topLifts.map(([name, data], i) => (
              <div
                key={name}
                className={`bg-black border-2 p-5 text-center relative overflow-hidden group hover:border-red-600/50 transition-all ${
                  i === 0 ? "border-yellow-600/60" : "border-zinc-800"
                }`}
              >
                {/* Rank badge */}
                <div className={`absolute top-0 left-0 text-[10px] font-mono font-black px-2 py-0.5 ${
                  i === 0 ? "bg-yellow-600 text-black" : i === 1 ? "bg-zinc-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-zinc-800 text-zinc-500"
                }`}>
                  #{i + 1}
                </div>
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mt-3 truncate">{name}</p>
                <p className={`text-3xl font-black mt-1 ${i === 0 ? "text-yellow-500" : "text-white"}`}>
                  {data.weight}<span className="text-sm text-zinc-500 ml-1">KG</span>
                </p>
                <p className="text-[10px] text-zinc-600 font-mono mt-1">
                  {data.reps} REPS · {data.date.toUpperCase()}
                </p>
              </div>
            ))}
          </div>

          {/* Recent PRs banner */}
          {prRecords.length > 0 && (
            <div className="mt-4 bg-yellow-600/10 border border-yellow-600/30 p-4">
              <p className="text-xs text-yellow-500 font-mono font-bold uppercase tracking-widest mb-2">
                ⚡ PRs ROTOS RECIENTEMENTE ({prRecords.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {prRecords.slice(0, 8).map((pr, i) => (
                  <span key={i} className="bg-black border border-yellow-600/30 px-3 py-1 text-xs font-mono font-bold text-yellow-400 uppercase">
                    {pr.exercise} {pr.weight}KG×{pr.reps}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── X-RAY: MUSCULAR ATTRIBUTES RADAR ── */}
      <section className="mt-6 brutalist-card p-6">
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
          <span className="text-red-600">X-RAY:</span> ATRIBUTOS MUSCULARES
        </h2>
        <div className="relative z-10 max-w-xl mx-auto opacity-90 grayscale contrast-150">
          <StatRadar data={radarData} />
        </div>
      </section>
    </div>
  );
}
