import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { redirect } from "next/navigation";
import MuscleHeatmap from "@/components/telemetry/MuscleHeatmap";
import { SessionComments } from "@/components/workout/SessionComments";

export default async function WorkoutHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) redirect("/auth/login");

  const history = await db.collection("workout_sessions")
    .find({ clientId: user._id })
    .sort({ finishedAt: -1 })
    .toArray();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
      <header className="mb-12 border-b-4 border-red-600 pb-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
          BITÁCORA DE COMBATE
        </h1>
        <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
          HISTORIAL DE SESIONES COMPLETADAS
        </p>
      </header>

      {history.length === 0 ? (
        <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
          AÚN NO HAY REGISTROS DE COMBATE. VE A ENTRENAR.
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((sessionLog) => {
            // Calcular volumen total de la sesión si no está cacheados
            let totalVolume = 0;
            const exercises = sessionLog.exercises || [];
            exercises.forEach((exe: any) => {
              (exe.sets || []).forEach((set: any) => {
                totalVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
              });
            });

            return (
              <details 
                key={sessionLog._id.toString()} 
                className="group brutalist-card overflow-hidden transition-all duration-300 open:border-red-600 mb-6"
              >
                <summary className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none list-none [&::-webkit-details-marker]:hidden relative bg-zinc-900 hover:bg-zinc-800 transition-colors">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-600 opacity-0 group-open:opacity-100 transition-all" />
                  
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-black text-white border-2 border-zinc-800 text-xs font-mono font-bold px-3 py-1 uppercase">
                        {new Date(sessionLog.finishedAt || sessionLog.startedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      <span className="text-white bg-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-widest px-3 py-1">
                        {sessionLog.type === "FREE" ? "LIBRE" : "PROGRAMA"}
                      </span>
                      {sessionLog.prsBroken > 0 && (
                        <span className="text-black bg-yellow-500 border-2 border-yellow-500 text-xs font-black uppercase tracking-widest px-3 py-1 flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                          🏆 {sessionLog.prsBroken} PRs
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl font-heading font-black text-white uppercase">{sessionLog.name}</h3>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right">
                    <div className="bg-black p-3 border-2 border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN TOTAL</div>
                      <div className="text-2xl font-black text-red-600">{totalVolume.toLocaleString()} <span className="text-sm font-bold text-zinc-500">KG</span></div>
                    </div>
                    <div className="bg-black p-3 border-2 border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">DURACIÓN</div>
                      <div className="text-2xl font-black text-white">{sessionLog.durationMinutes || "--"} <span className="text-sm font-bold text-zinc-500">MIN</span></div>
                    </div>
                    <div className="text-zinc-600 group-open:rotate-180 transition-transform font-black px-4">▼</div>
                  </div>
                </summary>

                <div className="p-6 pt-0 border-t-2 border-zinc-800 bg-black">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-sm text-red-600 font-mono font-bold uppercase tracking-widest mb-4">EJERCICIOS REALIZADOS</h4>
                      {exercises.map((exe: any, idx: number) => (
                        <div key={idx} className="bg-zinc-900 border-2 border-zinc-800 p-4">
                          <h4 className="font-heading font-black text-xl text-white mb-3 uppercase">{exe.exerciseName}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                            {(exe.sets || []).map((set: any, sIdx: number) => {
                              const isPR = set.isPR === true;
                              return (
                                <div key={sIdx} className={`bg-black px-3 py-2 border-2 text-center flex flex-col justify-center relative ${isPR ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-zinc-800'}`}>
                                  {isPR && (
                                    <span className="absolute -top-3 -right-2 text-lg drop-shadow-md">⭐</span>
                                  )}
                                  <span className={`text-[10px] font-mono font-bold ${isPR ? 'text-yellow-500' : 'text-zinc-500'}`}>SET {set.setNumber || sIdx + 1}</span>
                                  <span className={`font-black text-lg ${isPR ? 'text-yellow-400' : 'text-white'}`}>
                                    {set.weight}<span className={`text-[10px] ml-0.5 ${isPR ? 'text-yellow-600' : 'text-zinc-500'}`}>{set.unit || "KG"}</span> 
                                    <span className="text-red-600 mx-1">×</span> 
                                    {set.reps}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-black border-2 border-zinc-800 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                      <h4 className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold mb-4 relative z-10 w-full text-center">IMPACTO MUSCULAR</h4>
                      <MuscleHeatmap activeMuscles={['chest', 'shoulders', 'biceps']} className="w-full relative z-10" />
                    </div>
                  </div>

                  {/* Sección de Comentarios Interactiva */}
                  <SessionComments sessionId={sessionLog.publicId} />
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
