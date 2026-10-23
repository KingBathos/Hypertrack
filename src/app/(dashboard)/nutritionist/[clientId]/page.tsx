import { setNutritionProtocol } from "./actions";
import { getDb } from "@/lib/db/mongodb";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import WeightChart from "@/components/telemetry/WeightChart";
import { MacroRadialChart, MacroStackedChart } from "@/components/telemetry/NutritionCharts";
import { ACTIVITY_LEVEL_LABELS, ACTIVITY_MULTIPLIERS, TRAINING_EXPERIENCE_LABELS, TRAINING_PHASE_LABELS, STRESS_LEVEL_LABELS } from "@/lib/schemas/profile.schema";
import type { ActivityLevel } from "@/lib/schemas/profile.schema";
import { analyzeTrainingLoad } from "@/lib/domain/trainingLoad";

function getMealTypeBadge(type: string) {
  const norm = (type || "").toLowerCase();
  if (norm.includes("desayuno") || norm.includes("breakfast")) {
    return { label: "DESAYUNO", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
  }
  if (norm.includes("almuerzo") || norm.includes("lunch")) {
    return { label: "ALMUERZO", color: "bg-red-500/10 text-red-400 border-red-500/30" };
  }
  if (norm.includes("cena") || norm.includes("dinner")) {
    return { label: "CENA", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
  }
  return { label: (type || "SNACK").toUpperCase(), color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
}

export default async function NutritionistClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "NUTRITIONIST" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const resolvedParams = await params;
  const db = await getDb();
  const client = await db.collection("users").findOne({ publicId: resolvedParams.clientId });

  if (!client) {
    return <div className="text-white p-10 font-mono">Cliente no encontrado.</div>;
  }

  // ─────────────────────────────────────────────
  // 1. Profile & Biometrics (con TDEE REAL)
  // ─────────────────────────────────────────────
  const profile = await db.collection("profiles").findOne({ userId: client._id });
  let bmr = 0;
  let tdee = 0;
  let profileWeight = 0;
  let profileHeight = 0;
  let profileAge = 0;
  let profileSex = "N/A";
  let bodyFatPercent: number | null = null;
  let activityLevel: ActivityLevel | null = null;
  let activityLevelLabel = "N/A";
  let trainingExperience = "N/A";
  let trainingFrequency = 0;
  let sleepHours = 0;
  let stressLevel = "N/A";
  let trainingPhase = "N/A";
  let primaryGoal = "N/A";

  if (profile) {
    profileWeight = profile.physical?.weightKg || 0;
    profileHeight = profile.physical?.heightCm || 0;
    bodyFatPercent = profile.physical?.bodyFatPercentage || null;

    if (profile.demographics?.birthDate) {
      profileAge = new Date().getFullYear() - new Date(profile.demographics.birthDate).getFullYear();
    }
    profileSex = profile.demographics?.sex === "MALE" ? "HOMBRE" : profile.demographics?.sex === "FEMALE" ? "MUJER" : "N/A";

    // Lifestyle data
    activityLevel = profile.lifestyle?.activityLevel || null;
    activityLevelLabel = activityLevel ? (ACTIVITY_LEVEL_LABELS[activityLevel] || activityLevel) : "N/A";
    trainingExperience = profile.lifestyle?.trainingExperience ? (TRAINING_EXPERIENCE_LABELS[profile.lifestyle.trainingExperience as keyof typeof TRAINING_EXPERIENCE_LABELS] || profile.lifestyle.trainingExperience) : "N/A";
    trainingFrequency = profile.lifestyle?.trainingFrequencyDays || 0;
    sleepHours = profile.lifestyle?.sleepHoursAvg || 0;
    stressLevel = profile.lifestyle?.stressLevel ? (STRESS_LEVEL_LABELS[profile.lifestyle.stressLevel as keyof typeof STRESS_LEVEL_LABELS] || profile.lifestyle.stressLevel) : "N/A";
    trainingPhase = profile.goals?.trainingPhase ? (TRAINING_PHASE_LABELS[profile.goals.trainingPhase as keyof typeof TRAINING_PHASE_LABELS] || profile.goals.trainingPhase) : "N/A";
    primaryGoal = profile.goals?.primaryGoal || "N/A";

    // TDEE REAL = BMR × Factor de Actividad (Mifflin-St Jeor)
    if (profileWeight > 0 && profileHeight > 0 && profileAge > 0) {
      const isMale = profile.demographics?.sex === "MALE";
      bmr = isMale
        ? (10 * profileWeight) + (6.25 * profileHeight) - (5 * profileAge) + 5
        : (10 * profileWeight) + (6.25 * profileHeight) - (5 * profileAge) - 161;
      
      // Aplicar multiplicador de actividad si existe, default MODERATELY_ACTIVE
      const multiplier = activityLevel ? (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55) : 1.55;
      tdee = Math.round(bmr * multiplier);
    }
  }

  // ─────────────────────────────────────────────
  // 1b. Últimas circunferencias corporales
  // ─────────────────────────────────────────────
  const latestCircumference = await db.collection("body_measurements")
    .findOne(
      { userId: client._id, circumferences: { $exists: true } },
      { sort: { date: -1 } }
    );
  const circumferences = latestCircumference?.circumferences || null;
  const waistToHipRatio = latestCircumference?.waistToHipRatio || null;

  // ─────────────────────────────────────────────
  // 2. Active Nutrition Plan
  // ─────────────────────────────────────────────
  const activePlan = await db.collection("nutrition_plans").findOne(
    { clientId: client._id, status: "ACTIVE" },
    { sort: { "audit.createdAt": -1 } }
  );

  const planCalories = activePlan?.targets?.dailyCalories || activePlan?.dailyTargets?.calories || 0;
  const planProtein = activePlan?.targets?.macros?.protein || activePlan?.dailyTargets?.proteinGrams || 0;
  const planCarbs = activePlan?.targets?.macros?.carbs || activePlan?.dailyTargets?.carbsGrams || 0;
  const planFats = activePlan?.targets?.macros?.fats || activePlan?.dailyTargets?.fatsGrams || 0;
  const planCreatedAt = activePlan?.audit?.createdAt
    ? new Date(activePlan.audit.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  // ─────────────────────────────────────────────
  // 3. Weight Telemetry (with profile base)
  // ─────────────────────────────────────────────
  const measurementsRaw = await db.collection("body_measurements")
    .find({ userId: client._id })
    .sort({ date: 1 })
    .toArray();

  const weightData = measurementsRaw.map(m => ({
    date: new Date(m.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    weight: m.weight
  }));

  // FIX: Inject profile weight as Day 0 if no measurements exist or as starting point
  if (profileWeight > 0 && weightData.length === 0) {
    weightData.push({ date: "Inicio", weight: profileWeight });
  } else if (profileWeight > 0 && weightData.length > 0) {
    // Prepend profile weight as baseline only if it differs from first measurement
    const first = weightData[0];
    if (Math.abs(first.weight - profileWeight) > 0.5) {
      weightData.unshift({ date: "Perfil", weight: profileWeight });
    }
  }

  // Current weight (last measurement or profile)
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : profileWeight;
  const weightChange = weightData.length >= 2
    ? (weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)
    : null;

  // ─────────────────────────────────────────────
  // 4. Meal Logs — HISTORIAL COMPLETO DEL ATLETA
  // Buscamos todas las comidas asociadas al usuario (client._id y client.publicId)
  // El historial pertenece al ATLETA y persiste aunque cambie de nutricionista.
  // ─────────────────────────────────────────────
  const allMealLogs = await db.collection("meal_logs").find({
    $or: [
      { userId: client._id },
      { userId: client.publicId },
      { clientId: client._id },
      { clientId: client.publicId }
    ]
  }).sort({ date: -1, loggedAt: -1, "audit.createdAt": -1 }).toArray();

  // Filtrar comidas de los últimos 7 días para las gráficas de adherencia semanal
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMeals = allMealLogs.filter(meal => {
    const mealDate = meal.date || meal.loggedAt || meal.audit?.createdAt;
    return mealDate && new Date(mealDate) >= sevenDaysAgo;
  });

  // Compute daily macro totals for the chart (últimos 7 días)
  const dailyMap = new Map<string, { protein: number; carbs: number; fats: number; calories: number }>();
  recentMeals.forEach(meal => {
    const mealDate = meal.loggedAt || meal.date || meal.audit?.createdAt;
    if (!mealDate) return;
    const d = new Date(mealDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
    const existing = dailyMap.get(d) || { protein: 0, carbs: 0, fats: 0, calories: 0 };

    const p = meal.macros?.protein || meal.nutrition?.protein || 0;
    const c = meal.macros?.carbs || meal.nutrition?.carbs || 0;
    const f = meal.macros?.fats || meal.nutrition?.fats || 0;
    const cal = meal.calories || meal.nutrition?.calories || 0;

    existing.protein += Math.round(p * 4); // kcal from protein
    existing.carbs += Math.round(c * 4);   // kcal from carbs
    existing.fats += Math.round(f * 9);    // kcal from fats
    existing.calories += cal;
    dailyMap.set(d, existing);
  });
  const dailyMacroData = Array.from(dailyMap.entries()).map(([date, vals]) => ({ date, ...vals })).reverse();

  // Average macro consumption over 7 days
  const totalDays = Math.max(dailyMap.size, 1);
  const totalMacros = recentMeals.reduce((acc, meal) => {
    acc.protein += meal.macros?.protein || meal.nutrition?.protein || 0;
    acc.carbs += meal.macros?.carbs || meal.nutrition?.carbs || 0;
    acc.fats += meal.macros?.fats || meal.nutrition?.fats || 0;
    acc.calories += meal.calories || meal.nutrition?.calories || 0;
    return acc;
  }, { protein: 0, carbs: 0, fats: 0, calories: 0 });

  const avgProtein = Math.round(totalMacros.protein / totalDays);
  const avgCarbs = Math.round(totalMacros.carbs / totalDays);
  const avgFats = Math.round(totalMacros.fats / totalDays);
  const avgCalories = Math.round(totalMacros.calories / totalDays);

  // Adherence percentage
  let adherencePercent = 0;
  if (planCalories > 0 && dailyMap.size > 0) {
    const diff = Math.abs(avgCalories - planCalories);
    adherencePercent = Math.max(0, Math.round(100 - (diff / planCalories * 100)));
  }

  // Macro radial chart data
  const macroRadialData = [
    { name: "Proteína", consumed: avgProtein, target: planProtein, fill: "#ef4444" },
    { name: "Carbos", consumed: avgCarbs, target: planCarbs, fill: "#f59e0b" },
    { name: "Grasas", consumed: avgFats, target: planFats, fill: "#6366f1" },
  ];

  // ─────────────────────────────────────────────
  // 5. Workout Stats & Training Load Telemetry
  // ─────────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentWorkouts = await db.collection("workout_sessions").find({
    $or: [
      { clientId: client._id },
      { userId: client.publicId },
      { clientId: client.publicId }
    ],
    startedAt: { $gte: thirtyDaysAgo }
  }).sort({ startedAt: -1 }).limit(30).toArray();

  const athleteWeightForLoad = currentWeight > 0 ? currentWeight : (profileWeight > 0 ? profileWeight : 75);
  const trainingLoad = analyzeTrainingLoad(recentWorkouts as any, athleteWeightForLoad);

  const suggestedCalories = tdee > 0
    ? (trainingLoad.intensityLevel === "HEAVY" ? tdee + 350 : trainingLoad.intensityLevel === "LIGHT" ? tdee - 250 : tdee)
    : (trainingLoad.intensityLevel === "HEAVY" ? 2800 : trainingLoad.intensityLevel === "LIGHT" ? 2100 : 2500);

  const suggestedProtein = Math.round(athleteWeightForLoad * trainingLoad.nutritionalPrescription.suggestedProteinPerKg);
  const suggestedCarbs = Math.round(athleteWeightForLoad * trainingLoad.nutritionalPrescription.suggestedCarbsPerKg);
  const suggestedFats = Math.round((suggestedCalories * (trainingLoad.nutritionalPrescription.suggestedFatPercent / 100)) / 9);

  const totalSessions = recentWorkouts.length;
  const totalVolume = recentWorkouts.reduce((sum, w) => {
    let vol = w.totalVolume || 0;
    if (vol === 0 && w.exercises) {
      w.exercises.forEach((ex: any) => {
        ex.sets?.forEach((s: any) => {
          if (!s.isWarmup) vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        });
      });
    }
    return sum + vol;
  }, 0);
  const totalPRs = recentWorkouts.reduce((sum, w) => sum + (w.prsBroken || 0), 0);

  // ─────────────────────────────────────────────
  // 6. Agrupación por días para el Historial Completo
  // ─────────────────────────────────────────────
  interface MealItem {
    id: string;
    time: string;
    type: string;
    food: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }

  interface DayGroup {
    dateKey: string;
    formattedDate: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    meals: MealItem[];
  }

  const daysMap = new Map<string, DayGroup>();

  allMealLogs.forEach((meal: any) => {
    const rawDate = meal.date || meal.loggedAt || meal.audit?.createdAt;
    if (!rawDate) return;
    const dateObj = new Date(rawDate);
    const dateKey = dateObj.toISOString().split("T")[0];
    const formattedDate = dateObj.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const time = dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const calories = meal.calories || meal.nutrition?.calories || 0;
    const protein = meal.macros?.protein || meal.nutrition?.protein || 0;
    const carbs = meal.macros?.carbs || meal.nutrition?.carbs || 0;
    const fats = meal.macros?.fats || meal.nutrition?.fats || 0;

    const existing = daysMap.get(dateKey) || {
      dateKey,
      formattedDate: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      meals: []
    };

    existing.totalCalories += calories;
    existing.totalProtein += protein;
    existing.totalCarbs += carbs;
    existing.totalFats += fats;
    existing.meals.push({
      id: meal.publicId || meal._id?.toString() || Math.random().toString(),
      time,
      type: meal.mealType || meal.type || "Comida",
      food: meal.foodName || meal.name || meal.food || "Alimento",
      calories,
      protein,
      carbs,
      fats
    });

    daysMap.set(dateKey, existing);
  });

  const historicalDays = Array.from(daysMap.values());
  const totalLifetimeCalories = allMealLogs.reduce((acc, m) => acc + (m.calories || m.nutrition?.calories || 0), 0);

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-8 sm:pt-10 relative z-10">
      {/* ── NAVEGACIÓN DE RETORNO ── */}
      <div className="mb-6">
        <Link 
          href="/nutritionist"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>VOLVER AL ROSTER DE PACIENTES</span>
        </Link>
      </div>

      {/* ── HEADER ── */}
      <header className="mb-10 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            DASHBOARD DEL ATLETA
          </h1>
          <p className="mt-2 text-base sm:text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            CLIENTE: <span className="text-red-600 font-black">{client.name || client.email?.value || client.email}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            ID: <span className="text-zinc-400 select-all">{client.publicId}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-black border-2 border-zinc-800 px-4 py-2 text-right">
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">BMR (BASAL)</p>
            <p className="text-lg font-mono font-black text-zinc-400">{bmr > 0 ? `${Math.round(bmr)} KCAL` : "N/A"}</p>
          </div>
          <div className="bg-black border-2 border-red-600 px-4 py-2 text-right">
            <p className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest">TDEE REAL</p>
            <p className="text-2xl font-mono font-black text-white">{tdee > 0 ? `${tdee} KCAL` : "N/A"}</p>
            {activityLevel && <p className="text-[9px] text-zinc-500 font-mono font-bold">×{ACTIVITY_MULTIPLIERS[activityLevel]} ({activityLevelLabel})</p>}
          </div>
          <div className={`bg-black border-2 px-4 py-2 text-right ${adherencePercent >= 90 ? 'border-green-600' : adherencePercent >= 70 ? 'border-yellow-600' : 'border-red-600'}`}>
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">ADHERENCIA</p>
            <p className={`text-2xl font-mono font-black ${adherencePercent >= 90 ? 'text-green-500' : adherencePercent >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
              {activePlan ? `${adherencePercent}%` : "—"}
            </p>
          </div>
        </div>
      </header>

      {/* ── BODY COMPOSITION ROW ── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "PESO ACTUAL", value: currentWeight > 0 ? `${currentWeight} KG` : "—", accent: true },
          { label: "ALTURA", value: profileHeight > 0 ? `${profileHeight} CM` : "—" },
          { label: "EDAD", value: profileAge > 0 ? `${profileAge} AÑOS` : "—" },
          { label: "SEXO", value: profileSex },
          { label: "GRASA CORP.", value: bodyFatPercent ? `${bodyFatPercent}%` : "—" },
          {
            label: "Δ PESO",
            value: weightChange ? `${Number(weightChange) > 0 ? "+" : ""}${weightChange} KG` : "—",
            color: weightChange ? (Number(weightChange) > 0 ? "text-red-500" : "text-green-500") : undefined
          },
        ].map((stat, i) => (
          <div key={i} className={`bg-zinc-950 border-2 ${stat.accent ? 'border-red-600' : 'border-zinc-800'} p-4 text-center`}>
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-xl sm:text-2xl font-black ${stat.color || (stat.accent ? 'text-white' : 'text-zinc-300')}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* ── LIFESTYLE & CONTEXT ROW ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {[
          { label: "ACTIVIDAD", value: activityLevelLabel, accent: activityLevel === "VERY_ACTIVE" || activityLevel === "EXTRA_ACTIVE" },
          { label: "EXPERIENCIA", value: trainingExperience },
          { label: "FRECUENCIA", value: trainingFrequency > 0 ? `${trainingFrequency} DÍAS/SEM` : "—" },
          { label: "SUEÑO", value: sleepHours > 0 ? `${sleepHours}H` : "—", color: sleepHours >= 7 ? "text-green-400" : sleepHours >= 6 ? "text-yellow-400" : "text-red-400" },
          { label: "ESTRÉS", value: stressLevel },
          { label: "FASE", value: trainingPhase },
          { label: "OBJETIVO", value: primaryGoal },
          { label: "RATIO C/C", value: waistToHipRatio ? `${waistToHipRatio}` : "—", color: waistToHipRatio ? (profileSex === "HOMBRE" ? (waistToHipRatio <= 0.9 ? "text-green-400" : waistToHipRatio <= 1.0 ? "text-yellow-400" : "text-red-400") : (waistToHipRatio <= 0.85 ? "text-green-400" : waistToHipRatio <= 0.9 ? "text-yellow-400" : "text-red-400")) : undefined },
        ].map((stat, i) => (
          <div key={i} className={`bg-zinc-950 border-2 ${stat.accent ? 'border-orange-600' : 'border-zinc-800'} p-3 text-center`}>
            <p className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-xs sm:text-sm font-black ${stat.color || 'text-zinc-300'} truncate`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* ── CIRCUMFERENCES ROW ── */}
      {circumferences && (
        <section className="mb-8">
          <div className="bg-zinc-950 border-2 border-zinc-800 p-5">
            <h2 className="text-xs text-zinc-500 font-mono font-bold uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">
              📏 CIRCUNFERENCIAS CORPORALES (ÚLTIMA MEDICIÓN)
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "CINTURA", value: circumferences.waistCm, unit: "CM" },
                { label: "CADERA", value: circumferences.hipCm, unit: "CM" },
                { label: "PECHO", value: circumferences.chestCm, unit: "CM" },
                { label: "BRAZO", value: circumferences.armCm, unit: "CM" },
                { label: "MUSLO", value: circumferences.thighCm, unit: "CM" },
                { label: "PANTORRILLA", value: circumferences.calfCm, unit: "CM" },
              ].map((m, i) => (
                <div key={i} className="text-center p-2 bg-black border border-zinc-800">
                  <p className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-widest">{m.label}</p>
                  <p className="text-lg font-black text-white">{m.value ? `${m.value}` : "—"}</p>
                  <p className="text-[9px] text-zinc-600 font-mono font-bold">{m.unit}</p>
                </div>
              ))}
            </div>
            {waistToHipRatio && (
              <div className="mt-3 flex items-center justify-center gap-4 p-2 bg-black border border-zinc-800">
                <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest">RATIO CINTURA/CADERA:</span>
                <span className={`text-lg font-black ${
                  profileSex === "HOMBRE"
                    ? (waistToHipRatio <= 0.9 ? "text-green-400" : waistToHipRatio <= 1.0 ? "text-yellow-400" : "text-red-400")
                    : (waistToHipRatio <= 0.85 ? "text-green-400" : waistToHipRatio <= 0.9 ? "text-yellow-400" : "text-red-400")
                }`}>{waistToHipRatio}</span>
                <span className={`text-[10px] font-mono font-bold uppercase ${
                  profileSex === "HOMBRE"
                    ? (waistToHipRatio <= 0.9 ? "text-green-600" : waistToHipRatio <= 1.0 ? "text-yellow-600" : "text-red-600")
                    : (waistToHipRatio <= 0.85 ? "text-green-600" : waistToHipRatio <= 0.9 ? "text-yellow-600" : "text-red-600")
                }`}>
                  {profileSex === "HOMBRE"
                    ? (waistToHipRatio <= 0.9 ? "SALUDABLE" : waistToHipRatio <= 1.0 ? "RIESGO MODERADO" : "RIESGO ALTO")
                    : (waistToHipRatio <= 0.85 ? "SALUDABLE" : waistToHipRatio <= 0.9 ? "RIESGO MODERADO" : "RIESGO ALTO")
                  }
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ACTIVE PROTOCOL CARD ── */}
      {activePlan && (
        <section className="mb-8">
          <div className="bg-zinc-950 border-2 border-green-600/50 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-600 text-black text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1">
              ACTIVO
            </div>
            <h2 className="text-xs text-green-500 font-mono font-bold uppercase tracking-widest mb-4">
              PROTOCOLO NUTRICIONAL ACTUAL {planCreatedAt && <span className="text-zinc-500">· DESDE {planCreatedAt.toUpperCase()}</span>}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-black border border-zinc-800">
                <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest">CALORÍAS</p>
                <p className="text-3xl font-black text-white">{planCalories}</p>
                <p className="text-[10px] text-zinc-500 font-mono font-bold">KCAL / DÍA</p>
              </div>
              <div className="text-center p-3 bg-black border border-zinc-800">
                <p className="text-[9px] text-red-500 font-mono font-bold uppercase tracking-widest">PROTEÍNA</p>
                <p className="text-3xl font-black text-red-400">{planProtein}g</p>
                <p className="text-[10px] text-zinc-500 font-mono font-bold">{planProtein > 0 ? `${Math.round(planProtein * 4 / Math.max(planCalories, 1) * 100)}%` : "—"}</p>
              </div>
              <div className="text-center p-3 bg-black border border-zinc-800">
                <p className="text-[9px] text-yellow-500 font-mono font-bold uppercase tracking-widest">CARBOHIDRATOS</p>
                <p className="text-3xl font-black text-yellow-400">{planCarbs}g</p>
                <p className="text-[10px] text-zinc-500 font-mono font-bold">{planCarbs > 0 ? `${Math.round(planCarbs * 4 / Math.max(planCalories, 1) * 100)}%` : "—"}</p>
              </div>
              <div className="text-center p-3 bg-black border border-zinc-800">
                <p className="text-[9px] text-indigo-500 font-mono font-bold uppercase tracking-widest">GRASAS</p>
                <p className="text-3xl font-black text-indigo-400">{planFats}g</p>
                <p className="text-[10px] text-zinc-500 font-mono font-bold">{planFats > 0 ? `${Math.round(planFats * 9 / Math.max(planCalories, 1) * 100)}%` : "—"}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CHARTS ROW 1: Weight + Macro Adherence ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="brutalist-card p-6">
          <h2 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            EVOLUCIÓN DE PESO CORPORAL
          </h2>
          <WeightChart data={weightData} />
        </div>

        <div className="brutalist-card p-6">
          <h2 className="text-xl font-heading font-black text-white mb-4 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            ADHERENCIA A MACROS (PROMEDIO 7D)
          </h2>
          <MacroRadialChart data={macroRadialData} />
          {/* Numeric Breakdown below chart */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "PROTEÍNA", avg: avgProtein, target: planProtein, color: "text-red-400", bg: "border-red-600/30" },
              { label: "CARBOS", avg: avgCarbs, target: planCarbs, color: "text-yellow-400", bg: "border-yellow-600/30" },
              { label: "GRASAS", avg: avgFats, target: planFats, color: "text-indigo-400", bg: "border-indigo-600/30" },
            ].map(m => (
              <div key={m.label} className={`bg-black border-2 ${m.bg} p-3 text-center`}>
                <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest">{m.label}</p>
                <p className={`text-lg font-black ${m.color}`}>
                  {m.avg}g <span className="text-zinc-600 text-xs">/ {m.target}g</span>
                </p>
                <div className="mt-1 h-1.5 bg-zinc-900 w-full">
                  <div
                    className={`h-full transition-all duration-500`}
                    style={{
                      width: `${Math.min(m.target > 0 ? (m.avg / m.target) * 100 : 0, 100)}%`,
                      backgroundColor: m.color.includes("red") ? "#ef4444" : m.color.includes("yellow") ? "#f59e0b" : "#6366f1"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHART ROW 2: Caloric Breakdown Stacked ── */}
      <section className="mb-8">
        <div className="brutalist-card p-6">
          <h2 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            DESGLOSE CALÓRICO DIARIO — ÚLTIMOS 7 DÍAS
          </h2>
          <MacroStackedChart data={dailyMacroData} calorieTarget={planCalories} />
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Proteína</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Carbos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-indigo-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Grasas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TELEMETRÍA DE ENTRENAMIENTO Y DEMANDA METABÓLICA ── */}
      <section className="mb-10 brutalist-card p-6 border-2 relative overflow-hidden">
        {/* Header con Indicador de Intensidad */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-zinc-800 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏋️‍♂️</span>
              <h2 className="text-2xl sm:text-3xl font-heading font-black text-white uppercase tracking-wider">
                CARGA DE ENTRENAMIENTO // DEMANDA METABÓLICA
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-1">
              Telemetría deportiva cruzada para calibrar el volumen calórico, ingesta glucogénica y balance nitrogenado.
            </p>
          </div>

          {/* Badge Dinámico de Carga */}
          <div className={`px-5 py-3 border-2 ${trainingLoad.intensityBorder} ${trainingLoad.intensityBg} flex items-center gap-3 shrink-0`}>
            <div className={`h-3 w-3 rounded-full ${trainingLoad.intensityLevel === 'HEAVY' ? 'bg-red-500 animate-ping' : trainingLoad.intensityLevel === 'MODERATE' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <div>
              <p className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">ESTADO DETECTADO</p>
              <p className={`text-base sm:text-lg font-heading font-black uppercase ${trainingLoad.intensityColor}`}>
                {trainingLoad.intensityLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Grid de Métricas Deportivas Reales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-black border border-zinc-800 p-3 text-center">
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">FRECUENCIA (7D)</p>
            <p className="text-2xl font-black text-white">
              {trainingLoad.sessionsLast7Days} <span className="text-xs text-zinc-500 font-normal">SES/SEM</span>
            </p>
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{trainingLoad.sessionsLast30Days} en los últimos 30 días</p>
          </div>

          <div className="bg-black border border-zinc-800 p-3 text-center">
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN SEMANAL</p>
            <p className="text-2xl font-black text-white">
              {trainingLoad.weeklyVolumeKg > 0 ? `${(trainingLoad.weeklyVolumeKg / 1000).toFixed(1)}T` : "0T"}
            </p>
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{trainingLoad.weeklyVolumeKg.toLocaleString()} KG levantados</p>
          </div>

          <div className="bg-black border border-zinc-800 p-3 text-center">
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN / SESIÓN</p>
            <p className="text-2xl font-black text-white">
              {trainingLoad.avgSessionVolumeKg.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">KG</span>
            </p>
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">Promedio por sesión</p>
          </div>

          <div className="bg-black border border-zinc-800 p-3 text-center">
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">INTENSIDAD (RPE)</p>
            <p className={`text-2xl font-black ${trainingLoad.avgRpe >= 8.5 ? 'text-red-500' : trainingLoad.avgRpe >= 7.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {trainingLoad.avgRpe} <span className="text-xs text-zinc-500 font-normal">/ 10</span>
            </p>
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">Esfuerzo percibido</p>
          </div>

          <div className="bg-black border border-zinc-800 p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">DURACIÓN MEDIA</p>
            <p className="text-2xl font-black text-white">
              {trainingLoad.avgDurationMinutes} <span className="text-xs text-zinc-500 font-normal">MIN</span>
            </p>
            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{totalPRs} PRs rotos en 30d</p>
          </div>
        </div>

        {/* Panel de Guía Clínica para el Nutricionista */}
        <div className="bg-black border-2 border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-500 uppercase tracking-widest">
            <span>⚡</span>
            <span>PRESCRIPCIÓN NUTRICIONAL RECOMENDADA SEGÚN LA CARGA DE ENTRENAMIENTO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 p-4 border border-zinc-800/80">
              <p className="text-[10px] font-mono font-bold text-yellow-500 uppercase tracking-widest mb-1">
                🍚 ESTRATEGIA DE CARBOHIDRATOS (GLUCÓGENO)
              </p>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                {trainingLoad.nutritionalPrescription.carbStrategy}
              </p>
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-800/80">
              <p className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest mb-1">
                🥩 ESTRATEGIA PROTEICA (SÍNTESIS MIOFIBRILAR)
              </p>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                {trainingLoad.nutritionalPrescription.proteinStrategy}
              </p>
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-800/80">
              <p className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest mb-1">
                💧 HIDRATACIÓN Y BALANCE HÍDRICO
              </p>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                {trainingLoad.nutritionalPrescription.hydrationStrategy}
              </p>
            </div>
          </div>

          {/* Banner de Macros Sugeridos Calculados */}
          <div className="p-4 bg-zinc-900 border border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                🎯 PROTOCOLO SUGERIDO AUTOMÁTICAMENTE PARA ESTE ATLETA ({athleteWeightForLoad} KG):
              </p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {trainingLoad.nutritionalPrescription.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="bg-black border border-zinc-700 px-3 py-1.5 text-xs font-mono font-black text-white">
                {suggestedCalories} <span className="text-zinc-500 text-[10px]">KCAL</span>
              </span>
              <span className="bg-black border border-red-800/60 px-3 py-1.5 text-xs font-mono font-black text-red-400">
                {suggestedProtein}g <span className="text-zinc-500 text-[10px]">PRO</span>
              </span>
              <span className="bg-black border border-yellow-800/60 px-3 py-1.5 text-xs font-mono font-black text-yellow-400">
                {suggestedCarbs}g <span className="text-zinc-500 text-[10px]">CARB</span>
              </span>
              <span className="bg-black border border-indigo-800/60 px-3 py-1.5 text-xs font-mono font-black text-indigo-400">
                {suggestedFats}g <span className="text-zinc-500 text-[10px]">GRASA</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HISTORIAL DE ALIMENTACIÓN COMPLETO ── */}
      <section className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-l-4 border-red-600 pl-4">
          <div>
            <h2 className="text-3xl font-heading font-black text-white uppercase">
              HISTORIAL DE ALIMENTACIÓN DEL ATLETA
            </h2>
            <p className="text-sm text-zinc-400 font-mono mt-0.5">
              REGISTRO NUTRICIONAL COMPLETO // {allMealLogs.length} COMIDAS EN {historicalDays.length} DÍAS
            </p>
          </div>
        </div>

        {/* Resumen Histórico de Nutrición */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-black border-2 border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">COMIDAS REGISTRADAS</div>
            <div className="text-3xl font-heading font-black text-white">{allMealLogs.length}</div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1">HISTÓRICAS</div>
          </div>
          <div className="bg-black border-2 border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">DÍAS CON REGISTRO</div>
            <div className="text-3xl font-heading font-black text-white">{historicalDays.length}</div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1">DÍAS ACTIVOS</div>
          </div>
          <div className="bg-black border-2 border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">CALORÍAS TOTALES</div>
            <div className="text-3xl font-heading font-black text-red-500">
              {Math.round(totalLifetimeCalories).toLocaleString()} <span className="text-xs font-sans text-zinc-500">KCAL</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1">INGESTA HISTÓRICA</div>
          </div>
          <div className="bg-black border-2 border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">PROMEDIO DIARIO</div>
            <div className="text-3xl font-heading font-black text-yellow-500">
              {historicalDays.length > 0 ? Math.round(totalLifetimeCalories / historicalDays.length).toLocaleString() : 0} <span className="text-xs font-sans text-zinc-500">KCAL</span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1">EN DÍAS REGISTRADOS</div>
          </div>
        </div>

        {historicalDays.length === 0 ? (
          <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
            ESTE ATLETA AÚN NO HA REGISTRADO COMIDAS EN EL SISTEMA.
          </div>
        ) : (
          <div className="space-y-4">
            {historicalDays.map((day, idx) => {
              const dayDiff = planCalories > 0 ? day.totalCalories - planCalories : null;
              const dayAdherencePct = planCalories > 0 ? Math.round((day.totalCalories / planCalories) * 100) : null;

              return (
                <details 
                  key={day.dateKey} 
                  className="group brutalist-card overflow-hidden transition-all duration-300 open:border-red-600"
                  open={idx === 0}
                >
                  <summary className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none list-none [&::-webkit-details-marker]:hidden relative bg-zinc-900 hover:bg-zinc-800 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-600 opacity-0 group-open:opacity-100 transition-all" />

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="bg-black text-white border-2 border-zinc-800 text-xs font-mono font-bold px-3 py-1 uppercase">
                          {day.formattedDate}
                        </span>
                        <span className="text-zinc-400 bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold px-2.5 py-0.5">
                          {day.meals.length} {day.meals.length === 1 ? "COMIDA" : "COMIDAS"}
                        </span>
                        {dayAdherencePct !== null && (
                          <span className={`text-xs font-mono font-black uppercase px-2 py-0.5 border ${
                            Math.abs(100 - dayAdherencePct) <= 10 
                              ? "bg-green-500/10 text-green-400 border-green-500/30" 
                              : dayDiff! > 0 
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" 
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}>
                            {dayAdherencePct}% DEL PLAN {dayDiff! > 0 ? `(+${dayDiff} KCAL)` : `(${dayDiff} KCAL)`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-zinc-400 mt-1">
                        P: <span className="text-red-400 font-bold">{Math.round(day.totalProtein)}g</span> · C: <span className="text-yellow-400 font-bold">{Math.round(day.totalCarbs)}g</span> · G: <span className="text-indigo-400 font-bold">{Math.round(day.totalFats)}g</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div className="bg-black p-3 border-2 border-zinc-800 text-center min-w-28">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">TOTAL DÍA</div>
                        <div className="text-xl font-black text-white">
                          {Math.round(day.totalCalories).toLocaleString()} <span className="text-xs font-bold text-zinc-500">KCAL</span>
                        </div>
                      </div>
                      <div className="text-zinc-500 group-open:rotate-180 transition-transform font-black text-lg px-2">
                        ▼
                      </div>
                    </div>
                  </summary>

                  <div className="p-6 border-t-2 border-zinc-800 bg-black">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-zinc-800 bg-zinc-950">
                            <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">HORA</th>
                            <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">TIPO</th>
                            <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">ALIMENTO</th>
                            <th className="p-3 text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest text-right">KCAL</th>
                            <th className="p-3 text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest text-right">P (g)</th>
                            <th className="p-3 text-[10px] text-yellow-500 font-mono font-bold uppercase tracking-widest text-right">C (g)</th>
                            <th className="p-3 text-[10px] text-indigo-500 font-mono font-bold uppercase tracking-widest text-right">G (g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.meals.map((meal) => {
                            const badge = getMealTypeBadge(meal.type);
                            return (
                              <tr key={meal.id} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                                <td className="p-3 text-xs font-mono text-zinc-400">{meal.time}</td>
                                <td className="p-3">
                                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-bold text-white truncate max-w-xs">{meal.food}</td>
                                <td className="p-3 text-sm font-mono font-black text-white text-right">{meal.calories}</td>
                                <td className="p-3 text-sm font-mono font-bold text-red-400 text-right">{meal.protein}</td>
                                <td className="p-3 text-sm font-mono font-bold text-yellow-400 text-right">{meal.carbs}</td>
                                <td className="p-3 text-sm font-mono font-bold text-indigo-400 text-right">{meal.fats}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* ── PROTOCOL ASSIGNMENT FORM ── */}
      <section className="mb-12">
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          {activePlan ? "ACTUALIZAR PROTOCOLO NUTRICIONAL" : "NUEVO PROTOCOLO NUTRICIONAL"}
        </h2>
        <div className="brutalist-card p-6 md:p-10">
          <form action={setNutritionProtocol.bind(null, resolvedParams.clientId)} className="space-y-8">
            {/* Banner de Calibración por Carga de Entrenamiento */}
            <div className={`p-4 border-2 ${trainingLoad.intensityBorder} ${trainingLoad.intensityBg} flex flex-col sm:flex-row items-center justify-between gap-3`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    CALIBRACIÓN SUGERIDA: <span className={trainingLoad.intensityColor}>{trainingLoad.intensityLabel}</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Valores adaptados al volumen y RPE de este atleta ({athleteWeightForLoad} kg).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-black/80 border border-zinc-700 px-2.5 py-1 text-xs font-mono font-bold text-white">
                  {suggestedCalories} kcal
                </span>
                <span className="bg-black/80 border border-red-700/60 px-2.5 py-1 text-xs font-mono font-bold text-red-400">
                  {suggestedProtein}g P
                </span>
                <span className="bg-black/80 border border-yellow-700/60 px-2.5 py-1 text-xs font-mono font-bold text-yellow-400">
                  {suggestedCarbs}g C
                </span>
                <span className="bg-black/80 border border-indigo-700/60 px-2.5 py-1 text-xs font-mono font-bold text-indigo-400">
                  {suggestedFats}g G
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-white uppercase tracking-widest">
                CALORÍAS DIARIAS TOTALES (KCAL)
              </label>
              <input
                name="dailyCalories"
                type="number"
                required
                defaultValue={activePlan ? planCalories : suggestedCalories}
                placeholder={`EJ. ${suggestedCalories}`}
                className="w-full bg-black border-2 border-zinc-800 px-4 py-4 text-3xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
              />
              {tdee > 0 && (
                <div className="text-[10px] text-zinc-500 font-mono font-bold text-center uppercase tracking-widest space-y-1">
                  <p>BMR: {Math.round(bmr)} KCAL × {activityLevel ? ACTIVITY_MULTIPLIERS[activityLevel] : 1.55} = <span className="text-white">TDEE: {tdee} KCAL</span></p>
                  <p>DÉFICIT (-500): <span className="text-red-400">{tdee - 500} KCAL</span> · MANTENIMIENTO: <span className="text-green-400">{tdee} KCAL</span> · SUPERÁVIT (+300): <span className="text-yellow-400">{tdee + 300} KCAL</span></p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">
                  PROTEÍNA (G)
                </label>
                <input
                  name="protein"
                  type="number"
                  required
                  defaultValue={activePlan ? planProtein : suggestedProtein}
                  placeholder={`SUG: ${suggestedProtein}`}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
                {athleteWeightForLoad > 0 && (
                  <p className="text-[9px] text-zinc-500 font-mono font-bold text-center uppercase">
                    SUGERIDO: {suggestedProtein}g ({trainingLoad.nutritionalPrescription.suggestedProteinPerKg} g/kg)
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-mono font-bold text-yellow-500 uppercase tracking-widest">
                  CARBOHIDRATOS (G)
                </label>
                <input
                  name="carbs"
                  type="number"
                  required
                  defaultValue={activePlan ? planCarbs : suggestedCarbs}
                  placeholder={`SUG: ${suggestedCarbs}`}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
                {athleteWeightForLoad > 0 && (
                  <p className="text-[9px] text-zinc-500 font-mono font-bold text-center uppercase">
                    SUGERIDO: {suggestedCarbs}g ({trainingLoad.nutritionalPrescription.suggestedCarbsPerKg} g/kg)
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest">
                  GRASAS (G)
                </label>
                <input
                  name="fats"
                  type="number"
                  required
                  defaultValue={activePlan ? planFats : suggestedFats}
                  placeholder={`SUG: ${suggestedFats}`}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
                <p className="text-[9px] text-zinc-500 font-mono font-bold text-center uppercase">
                  SUGERIDO: {suggestedFats}g ({trainingLoad.nutritionalPrescription.suggestedFatPercent}% VCT)
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="brutalist-button w-full text-center p-5 text-xl mt-8"
            >
              {activePlan ? "ACTUALIZAR PROTOCOLO" : "ESTABLECER PROTOCOLO NUTRICIONAL"}
            </button>
          </form>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}} />
    </div>
  );
}
