import { setNutritionProtocol } from "./actions";
import { getDb } from "@/lib/db/mongodb";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import WeightChart from "@/components/telemetry/WeightChart";
import { MacroRadialChart, MacroStackedChart } from "@/components/telemetry/NutritionCharts";
import { ACTIVITY_LEVEL_LABELS, ACTIVITY_MULTIPLIERS, TRAINING_EXPERIENCE_LABELS, TRAINING_PHASE_LABELS, STRESS_LEVEL_LABELS } from "@/lib/schemas/profile.schema";
import type { ActivityLevel } from "@/lib/schemas/profile.schema";

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
  // 4. Meal Logs — Last 7 days (macro adherence + detailed meals)
  // ─────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMeals = await db.collection("meal_logs").find({
    userId: client._id,
    $or: [
      { loggedAt: { $gte: sevenDaysAgo } },
      { date: { $gte: sevenDaysAgo } },
      { "audit.createdAt": { $gte: sevenDaysAgo } }
    ]
  }).sort({ loggedAt: -1, date: -1, "audit.createdAt": -1 }).limit(50).toArray();

  // Compute daily macro totals for the chart
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
  // 5. Workout Stats (recent sessions)
  // ─────────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentWorkouts = await db.collection("workout_sessions").find({
    clientId: client._id,
    "audit.createdAt": { $gte: thirtyDaysAgo }
  }).sort({ "audit.createdAt": -1 }).limit(20).toArray();

  const totalSessions = recentWorkouts.length;
  const totalVolume = recentWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const totalPRs = recentWorkouts.reduce((sum, w) => sum + (w.prsBroken || 0), 0);

  // ─────────────────────────────────────────────
  // 6. Serialize meal logs for display table
  // ─────────────────────────────────────────────
  const mealLogRows = recentMeals.slice(0, 20).map(meal => ({
    date: new Date(meal.loggedAt || meal.date || meal.audit?.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    type: meal.mealType || meal.type || "—",
    food: meal.foodName || meal.name || meal.food || "—",
    calories: meal.calories || meal.nutrition?.calories || 0,
    protein: meal.macros?.protein || meal.nutrition?.protein || 0,
    carbs: meal.macros?.carbs || meal.nutrition?.carbs || 0,
    fats: meal.macros?.fats || meal.nutrition?.fats || 0,
  }));

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pt-8 sm:pt-10">
      {/* ── HEADER ── */}
      <header className="mb-10 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            DASHBOARD DEL ATLETA
          </h1>
          <p className="mt-2 text-base sm:text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            CLIENTE: <span className="text-red-600 font-black">{client.name || client.email?.value || client.email}</span>
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

      {/* ── WORKOUT STATS ROW (Cross-domain) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-950 border-2 border-zinc-800 p-5 text-center">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">SESIONES (30D)</p>
          <p className="text-4xl font-black text-white">{totalSessions}</p>
        </div>
        <div className="bg-zinc-950 border-2 border-zinc-800 p-5 text-center">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN TOTAL (30D)</p>
          <p className="text-4xl font-black text-white">{totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}T` : "—"}</p>
        </div>
        <div className="bg-zinc-950 border-2 border-zinc-800 p-5 text-center">
          <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">PRs ROTOS (30D)</p>
          <p className={`text-4xl font-black ${totalPRs > 0 ? 'text-yellow-500' : 'text-zinc-600'}`}>{totalPRs}</p>
        </div>
      </section>

      {/* ── RECENT MEALS TABLE ── */}
      <section className="mb-10">
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          REGISTRO DE COMIDAS RECIENTES
        </h2>
        <div className="brutalist-card overflow-hidden">
          {mealLogRows.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 font-mono font-bold uppercase tracking-widest">
              SIN REGISTROS DE COMIDAS EN LOS ÚLTIMOS 7 DÍAS
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-zinc-800 bg-black">
                    <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">FECHA</th>
                    <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">TIPO</th>
                    <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">ALIMENTO</th>
                    <th className="p-3 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest text-right">KCAL</th>
                    <th className="p-3 text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest text-right">P (g)</th>
                    <th className="p-3 text-[10px] text-yellow-500 font-mono font-bold uppercase tracking-widest text-right">C (g)</th>
                    <th className="p-3 text-[10px] text-indigo-500 font-mono font-bold uppercase tracking-widest text-right">G (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {mealLogRows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3 text-xs font-mono text-zinc-400">{row.date}</td>
                      <td className="p-3 text-xs font-mono font-bold text-zinc-300 uppercase">{row.type}</td>
                      <td className="p-3 text-sm font-bold text-white truncate max-w-50">{row.food}</td>
                      <td className="p-3 text-sm font-mono font-black text-white text-right">{row.calories}</td>
                      <td className="p-3 text-sm font-mono font-bold text-red-400 text-right">{row.protein}</td>
                      <td className="p-3 text-sm font-mono font-bold text-yellow-400 text-right">{row.carbs}</td>
                      <td className="p-3 text-sm font-mono font-bold text-indigo-400 text-right">{row.fats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── PROTOCOL ASSIGNMENT FORM ── */}
      <section className="mb-12">
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          {activePlan ? "ACTUALIZAR PROTOCOLO NUTRICIONAL" : "NUEVO PROTOCOLO NUTRICIONAL"}
        </h2>
        <div className="brutalist-card p-6 md:p-10">
          <form action={setNutritionProtocol.bind(null, resolvedParams.clientId)} className="space-y-8">
            <div className="space-y-4">
              <label className="block text-sm font-black text-white uppercase tracking-widest">
                CALORÍAS DIARIAS TOTALES (KCAL)
              </label>
              <input
                name="dailyCalories"
                type="number"
                required
                defaultValue={activePlan ? planCalories : undefined}
                placeholder={`EJ. ${tdee > 0 ? tdee : 2500}`}
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
                  defaultValue={activePlan ? planProtein : undefined}
                  placeholder={profileWeight > 0 ? `SUG: ${Math.round(profileWeight * 2)}` : "0"}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
                {profileWeight > 0 && (
                  <p className="text-[9px] text-zinc-600 font-mono font-bold text-center uppercase">
                    RECOMENDADO: {Math.round(profileWeight * 1.8)} - {Math.round(profileWeight * 2.2)}g
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
                  defaultValue={activePlan ? planCarbs : undefined}
                  placeholder="0"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest">
                  GRASAS (G)
                </label>
                <input
                  name="fats"
                  type="number"
                  required
                  defaultValue={activePlan ? planFats : undefined}
                  placeholder="0"
                  className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-4 text-2xl font-black text-white focus:outline-none focus:border-red-600 transition-all text-center"
                />
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
