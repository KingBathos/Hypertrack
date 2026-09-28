import { getDb } from "@/lib/db/mongodb";
import { assignProgramToClient } from "@/actions/workout";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import StatRadar from "@/components/telemetry/StatRadar";
import MuscleHeatmap from "@/components/telemetry/MuscleHeatmap";

export default async function AssignProgramPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) redirect("/dashboard");

  const resolvedParams = await params;
  const db = await getDb();
  
  // Obtener coach, cliente y programas
  const coach = await db.collection("users").findOne({ publicId: session.sub });
  const client = await db.collection("users").findOne({ publicId: resolvedParams.clientId });
  if (!coach || !client) return <div className="text-white p-10">Datos no encontrados.</div>;

  const programs = await db.collection("training_programs").find({ authorId: coach._id }).toArray();

  // 1. Fetch 30-day telemetry for this client
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const workoutSessionsCol = db.collection("workout_sessions");
  const recentWorkouts = await workoutSessionsCol.find({ clientId: client._id, startedAt: { $gte: thirtyDaysAgo } }).toArray();

  // 2. Process Telemetry (Radar & Heatmap)
  const radarMetrics = { Push: 0, Pull: 0, Legs: 0, Core: 0 };
  const muscleFrequency: Record<string, number> = {
    chest: 0, shoulders: 0, abs: 0, biceps: 0, quads: 0, calves: 0
  };
  
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

      // Heatmap mapping
      if (name.includes("pecho") || name.includes("banca") || name.includes("chest")) muscleFrequency.chest += 1;
      if (name.includes("hombro") || name.includes("militar") || name.includes("shoulder")) muscleFrequency.shoulders += 1;
      if (name.includes("bicep") || name.includes("curl") || name.includes("dominada")) muscleFrequency.biceps += 1;
      if (name.includes("sentadilla") || name.includes("squat") || name.includes("prensa")) muscleFrequency.quads += 1;
      if (name.includes("gemelo") || name.includes("calve")) muscleFrequency.calves += 1;
      if (name.includes("abs") || name.includes("core") || name.includes("crunch")) muscleFrequency.abs += 1;
    });
  });

  const maxVolume = Math.max(1000, ...Object.values(radarMetrics));
  const radarData = [
    { subject: 'Push', A: radarMetrics.Push, fullMark: maxVolume },
    { subject: 'Pull', A: radarMetrics.Pull, fullMark: maxVolume },
    { subject: 'Legs', A: radarMetrics.Legs, fullMark: maxVolume },
    { subject: 'Core', A: radarMetrics.Core, fullMark: maxVolume },
  ];

  // Active muscles for heatmap (if they did it at least once in 30 days)
  const activeMuscles = Object.entries(muscleFrequency)
    .filter(([_, count]) => count > 0)
    .map(([muscle]) => muscle);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            DASHBOARD DEL ATLETA
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            CLIENTE: <span className="text-red-600 font-black">{client.name || client.email.value}</span>
          </p>
        </div>
        <div className="bg-black border-2 border-zinc-800 px-4 py-2 text-right">
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">WORKOUTS 30 DÍAS</p>
          <p className="text-2xl font-mono font-black text-white">{recentWorkouts.length}</p>
        </div>
      </header>

      {/* Panel de Telemetría (Radar y Heatmap) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="brutalist-card p-6">
          <h2 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            <span className="text-red-600">X-RAY:</span> ATRIBUTOS MUSCULARES
          </h2>
          <div className="relative z-10 max-w-sm mx-auto">
            <StatRadar data={radarData} />
          </div>
        </div>

        <div className="brutalist-card p-6">
          <h2 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
            MAPA TÉRMICO DE FATIGA
          </h2>
          <div className="relative z-10 w-full flex justify-center">
            {activeMuscles.length === 0 ? (
               <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest font-bold">
                 SIN DATOS DE FATIGA
               </div>
            ) : (
               <MuscleHeatmap activeMuscles={activeMuscles} />
            )}
          </div>
        </div>
      </section>

      {/* Asignación de Programa */}
      <section>
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          NUEVO PROTOCOLO
        </h2>
        {programs.length === 0 ? (
          <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
            NO TIENES PROGRAMAS CREADOS. CREA UNO PRIMERO EN EL CONSTRUCTOR DE PROGRAMAS.
          </div>
        ) : (
          <div className="brutalist-card p-6 md:p-10">
            <form 
              action={async (formData) => {
                "use server";
                const programId = formData.get("programId")?.toString();
                if (programId) {
                  await assignProgramToClient(resolvedParams.clientId, programId);
                }
              }}
              className="space-y-8"
            >
              <div>
                <label className="block text-sm font-black text-white uppercase tracking-widest mb-4">SELECCIONAR PROGRAMA MAESTRO</label>
                <div className="space-y-3">
                  {programs.map(prog => (
                    <label key={prog.publicId} className="flex items-center gap-4 bg-black border-2 border-zinc-800 p-4 cursor-pointer hover:border-red-600 transition-all has-checked:border-red-600 has-checked:bg-red-600/10">
                      <input 
                        type="radio" 
                        name="programId" 
                        value={prog.publicId} 
                        required 
                        className="w-6 h-6 accent-red-600"
                      />
                      <div>
                        <div className="font-heading font-black text-2xl text-white uppercase">{prog.name}</div>
                        <div className="text-xs text-zinc-500 font-mono font-bold mt-1 uppercase">{prog.exercises?.length || 0} EJERCICIOS</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="brutalist-button w-full text-center p-5 text-xl"
              >
                ASIGNAR A CLIENTE
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
