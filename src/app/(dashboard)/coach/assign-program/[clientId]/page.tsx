import { getDb } from "@/lib/db/mongodb";
import { assignProgramToClient } from "@/actions/workout";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatRadar from "@/components/telemetry/StatRadar";
import MuscleHeatmap from "@/components/telemetry/MuscleHeatmap";
import { SessionComments } from "@/components/workout/SessionComments";

function getStatusBadge(status?: string) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "ACTIVE":
      return { label: "ACTIVO", dotColor: "bg-emerald-500", textColor: "text-emerald-400" };
    case "PENDING_VERIFICATION":
      return { label: "PENDIENTE", dotColor: "bg-yellow-500", textColor: "text-yellow-400" };
    case "LOCKED":
      return { label: "BLOQUEADO", dotColor: "bg-red-600", textColor: "text-red-500" };
    case "SUSPENDED":
      return { label: "SUSPENDIDO", dotColor: "bg-zinc-500", textColor: "text-zinc-400" };
    default:
      return { label: norm || "ACTIVO", dotColor: "bg-emerald-500", textColor: "text-emerald-400" };
  }
}

export default async function AssignProgramPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) redirect("/dashboard");

  const resolvedParams = await params;
  const db = await getDb();
  
  // Obtener coach y cliente
  const coach = await db.collection("users").findOne({ publicId: session.sub });
  const client = await db.collection("users").findOne({ publicId: resolvedParams.clientId });
  if (!coach || !client) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-heading font-black text-white uppercase">Atleta no encontrado</h2>
        <p className="text-zinc-500 font-mono mt-2 text-sm">El usuario solicitado no existe o no está registrado.</p>
        <Link href="/coach" className="inline-block brutalist-button px-6 py-3 mt-6 text-sm">
          ← VOLVER AL ROSTER
        </Link>
      </div>
    );
  }

  // 1. Programas creados por este coach para asignar
  const programs = await db.collection("training_programs").find({ authorId: coach._id }).toArray();

  // 2. Programa activo actual del cliente
  const activeAssignment = await db.collection("program_assignments").findOne({
    clientId: client._id,
    status: "ACTIVE"
  });

  let activeProgram = null;
  if (activeAssignment?.programVersionId) {
    activeProgram = await db.collection("training_programs").findOne({
      _id: activeAssignment.programVersionId
    });
  }

  // 3. Historial de entrenamientos del atleta (relacionado al usuario por client._id y publicId)
  // Al cambiar de entrenador, el nuevo entrenador tiene acceso a todas las sesiones históricas
  const workoutSessionsCol = db.collection("workout_sessions");
  const allWorkouts = await workoutSessionsCol
    .find({
      $or: [
        { clientId: client._id },
        { userId: client.publicId },
        { clientId: client.publicId }
      ]
    })
    .sort({ startedAt: -1, finishedAt: -1 })
    .toArray();

  // 4. Personal Records (PRs) del usuario
  const prs = await db.collection("personal_records")
    .find({
      $or: [
        { clientId: client._id },
        { userId: client.publicId }
      ]
    })
    .sort({ dateAchieved: -1 })
    .toArray();

  // 5. Procesamiento de telemetría y métricas acumuladas
  let totalLifetimeVolume = 0;
  const radarMetrics = { Push: 0, Pull: 0, Legs: 0, Core: 0 };
  const muscleFrequency: Record<string, number> = {
    chest: 0, shoulders: 0, abs: 0, biceps: 0, quads: 0, calves: 0
  };

  allWorkouts.forEach((sessionLog: any) => {
    (sessionLog.exercises || []).forEach((exe: any) => {
      const name = (exe.exerciseName || exe.name || "").toLowerCase();
      let category = "Core";
      if (name.includes("press") || name.includes("push") || name.includes("pecho") || name.includes("hombro") || name.includes("tricep") || name.includes("banca")) category = "Push";
      else if (name.includes("pull") || name.includes("remo") || name.includes("dominada") || name.includes("espalda") || name.includes("bicep")) category = "Pull";
      else if (name.includes("sentadilla") || name.includes("squat") || name.includes("pierna") || name.includes("peso muerto") || name.includes("leg") || name.includes("prensa")) category = "Legs";

      let exVolume = 0;
      (exe.sets || []).forEach((s: any) => {
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        exVolume += w * r;
      });

      totalLifetimeVolume += exVolume;
      radarMetrics[category as keyof typeof radarMetrics] += exVolume;

      // Mapeo para mapa térmico
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

  const activeMuscles = Object.entries(muscleFrequency)
    .filter(([_, count]) => count > 0)
    .map(([muscle]) => muscle);

  const statusConfig = getStatusBadge(client.account?.status);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
      {/* Navegación de retorno */}
      <div className="mb-6">
        <Link 
          href="/coach"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>VOLVER AL ROSTER DE ATLETAS</span>
        </Link>
      </div>

      {/* Cabecera del Expediente */}
      <header className="mb-10 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-red-600 text-white font-black text-xs px-2.5 py-0.5 uppercase tracking-wider">
              EXPEDIENTE DE ATLETA
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 border text-xs font-mono font-bold uppercase ${statusConfig.textColor} border-zinc-800 bg-black`}>
              <span className={`h-2 w-2 rounded-full ${statusConfig.dotColor}`} />
              <span>{statusConfig.label}</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black text-white uppercase tracking-tighter">
            {client.name || client.email.value.split('@')[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-400 font-mono">
            {client.email.value}
          </p>
        </div>

        <div className="bg-black border-2 border-zinc-800 p-3 text-right w-full md:w-auto">
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">ID DEL ATLETA</p>
          <p className="text-xs font-mono font-black text-red-500 select-all">{client.publicId}</p>
        </div>
      </header>

      {/* Resumen de Métricas Clave */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-black border-2 border-zinc-800 p-4">
          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">SESIONES REGISTRADAS</div>
          <div className="text-3xl font-heading font-black text-white">{allWorkouts.length}</div>
          <div className="text-[11px] text-zinc-400 font-mono mt-1">HISTÓRICAS</div>
        </div>
        <div className="bg-black border-2 border-zinc-800 p-4">
          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN TOTAL</div>
          <div className="text-3xl font-heading font-black text-red-600">
            {Math.round(totalLifetimeVolume).toLocaleString()} <span className="text-xs font-sans text-zinc-500">KG</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-1">CARGA DE POR VIDA</div>
        </div>
        <div className="bg-black border-2 border-zinc-800 p-4">
          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">RÉCORDS PR</div>
          <div className="text-3xl font-heading font-black text-yellow-500">{prs.length}</div>
          <div className="text-[11px] text-zinc-400 font-mono mt-1">MARCAS ACTIVAS</div>
        </div>
        <div className="bg-black border-2 border-zinc-800 p-4">
          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">PROGRAMA ACTIVO</div>
          <div className="text-xl font-heading font-black text-white truncate" title={activeProgram?.name || "NINGUNO"}>
            {activeProgram ? activeProgram.name : "NINGUNO"}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-1">
            {activeProgram ? `${activeProgram.exercises?.length || 0} EJERCICIOS` : "SIN ASIGNACIÓN"}
          </div>
        </div>
      </section>

      {/* Estado del Programa Activo */}
      {activeProgram && (
        <section className="mb-10 brutalist-card p-6 border-red-600 bg-red-950/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-800">
            <div>
              <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest">
                ● EN EJECUCIÓN POR EL ATLETA
              </span>
              <h2 className="text-2xl md:text-3xl font-heading font-black text-white uppercase mt-1">
                {activeProgram.name}
              </h2>
              {activeProgram.description && (
                <p className="text-zinc-400 text-sm mt-1">{activeProgram.description}</p>
              )}
            </div>
            <div className="text-left md:text-right font-mono text-xs text-zinc-400">
              <p className="text-zinc-500 uppercase text-[10px] font-bold">ASIGNADO EL</p>
              <p className="text-white font-bold">
                {activeAssignment?.startDate ? new Date(activeAssignment.startDate!).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "--"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
              EJERCICIOS ASIGNADOS EN ESTE PROTOCOLO ({activeProgram.exercises?.length || 0}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(activeProgram.exercises || []).map((ex: any, idx: number) => (
                <div key={idx} className="bg-black border border-zinc-800 p-3">
                  <p className="font-heading font-black text-white text-sm uppercase">{ex.exerciseName || ex.name}</p>
                  <p className="text-xs font-mono text-zinc-500 mt-1">
                    {ex.targetSets || 3} SERIES × {ex.targetReps || "8-12"} REPS • RPE {ex.targetRpe || 8}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECCIÓN 1: HISTORIAL DE ENTRENAMIENTO COMPLETO */}
      <section className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-l-4 border-red-600 pl-4">
          <div>
            <h2 className="text-3xl font-heading font-black text-white uppercase">
              HISTORIAL DE ENTRENAMIENTOS
            </h2>
            <p className="text-sm text-zinc-400 font-mono mt-0.5">
              REGISTRO COMPLETO DEL ATLETA // {allWorkouts.length} SESIONES
            </p>
          </div>
        </div>

        {allWorkouts.length === 0 ? (
          <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
            ESTE ATLETA AÚN NO HA REGISTRADO SESIONES DE ENTRENAMIENTO EN EL SISTEMA.
          </div>
        ) : (
          <div className="space-y-4">
            {allWorkouts.map((sessionLog: any) => {
              let sessionVolume = 0;
              const exercises = sessionLog.exercises || [];
              exercises.forEach((exe: any) => {
                (exe.sets || []).forEach((set: any) => {
                  sessionVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
                });
              });

              const dateStr = sessionLog.finishedAt || sessionLog.startedAt;
              const formattedDate = dateStr 
                ? new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
                : "--";

              const sessionIdStr = sessionLog.publicId || sessionLog._id.toString();

              return (
                <details 
                  key={sessionIdStr} 
                  className="group brutalist-card overflow-hidden transition-all duration-300 open:border-red-600"
                >
                  <summary className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none list-none [&::-webkit-details-marker]:hidden relative bg-zinc-900 hover:bg-zinc-800 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-600 opacity-0 group-open:opacity-100 transition-all" />
                    
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="bg-black text-white border-2 border-zinc-800 text-xs font-mono font-bold px-3 py-1 uppercase">
                          {formattedDate}
                        </span>
                        <span className="text-white bg-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-widest px-3 py-1">
                          {sessionLog.type === "FREE" ? "LIBRE" : "PROGRAMA"}
                        </span>
                        {sessionLog.prsBroken > 0 && (
                          <span className="text-black bg-yellow-500 border-2 border-yellow-500 text-xs font-black uppercase tracking-widest px-3 py-1 flex items-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                            🏆 {sessionLog.prsBroken} PRs
                          </span>
                        )}
                        <span className="text-zinc-500 text-xs font-mono font-bold ml-1">
                          {exercises.length} EJERCICIOS
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-heading font-black text-white uppercase group-hover:text-red-500 transition-colors">
                        {sessionLog.name || "Sesión de Entrenamiento"}
                      </h3>
                      {sessionLog.notes && (
                        <p className="text-zinc-400 text-xs mt-1 font-mono italic">
                          "{sessionLog.notes}"
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div className="bg-black p-3 border-2 border-zinc-800 text-center min-w-[110px]">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">VOLUMEN</div>
                        <div className="text-xl font-black text-red-600">{Math.round(sessionVolume).toLocaleString()} <span className="text-xs font-bold text-zinc-500">KG</span></div>
                      </div>
                      <div className="bg-black p-3 border-2 border-zinc-800 text-center min-w-[90px]">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">DURACIÓN</div>
                        <div className="text-xl font-black text-white">{sessionLog.durationMinutes || "--"} <span className="text-xs font-bold text-zinc-500">MIN</span></div>
                      </div>
                      <div className="text-zinc-500 group-open:rotate-180 transition-transform font-black text-lg px-2">
                        ▼
                      </div>
                    </div>
                  </summary>

                  <div className="p-6 border-t-2 border-zinc-800 bg-black">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Desglose de ejercicios y series */}
                      <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-sm text-red-600 font-mono font-bold uppercase tracking-widest mb-3">
                          EJERCICIOS Y CARGAS
                        </h4>
                        {exercises.map((exe: any, idx: number) => (
                          <div key={idx} className="bg-zinc-900 border-2 border-zinc-800 p-4">
                            <h5 className="font-heading font-black text-lg text-white mb-3 uppercase">
                              {exe.exerciseName || exe.name}
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                              {(exe.sets || []).map((set: any, sIdx: number) => {
                                const isPR = set.isPR === true;
                                return (
                                  <div 
                                    key={sIdx} 
                                    className={`bg-black px-3 py-2 border-2 text-center flex flex-col justify-center relative ${
                                      isPR ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-zinc-800'
                                    }`}
                                  >
                                    {isPR && (
                                      <span className="absolute -top-3 -right-2 text-base drop-shadow-md">⭐</span>
                                    )}
                                    <span className={`text-[10px] font-mono font-bold ${isPR ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                      SET {set.setNumber || sIdx + 1}
                                    </span>
                                    <div className="font-mono font-black text-base text-white my-0.5">
                                      {set.weight} <span className="text-[10px] text-zinc-500">{set.unit || "KG"}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                                      {set.reps} REPS {set.rpe ? `• RPE ${set.rpe}` : ""}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Columna Lateral: Feedback del Coach & Comentarios */}
                      <div className="border-t-2 lg:border-t-0 lg:border-l-2 border-zinc-800 lg:pl-6 pt-6 lg:pt-0">
                        <h4 className="text-sm text-red-600 font-mono font-bold uppercase tracking-widest mb-4">
                          FEEDBACK DEL ENTRENADOR
                        </h4>
                        <SessionComments sessionId={sessionIdStr} />
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* SECCIÓN 2: TELEMETRÍA (Radar y Heatmap) */}
      <section className="mb-12">
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          BIOMECÁNICA Y TELEMETRÍA
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="brutalist-card p-6">
            <h3 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
              <span className="text-red-600">X-RAY:</span> BALANCE MUSCULAR
            </h3>
            <div className="relative z-10 max-w-sm mx-auto">
              <StatRadar data={radarData} />
            </div>
          </div>

          <div className="brutalist-card p-6">
            <h3 className="text-xl font-heading font-black text-white mb-6 uppercase tracking-wider text-center border-b-2 border-zinc-800 pb-4">
              MAPA TÉRMICO DE ACTIVACIÓN
            </h3>
            <div className="relative z-10 w-full flex justify-center">
              {activeMuscles.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest font-bold">
                  SIN REGISTROS SUFICIENTES
                </div>
              ) : (
                <MuscleHeatmap activeMuscles={activeMuscles} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: RÉCORDS PERSONALES (PRs) */}
      {prs.length > 0 && (
        <section className="mb-12">
          <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
            MARCAS Y RÉCORDS PERSONALES
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prs.map((pr: any) => (
              <div key={pr._id?.toString()} className="bg-black border-2 border-zinc-800 p-4 relative group hover:border-yellow-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-heading font-black text-lg text-white uppercase truncate">
                    {pr.exerciseName}
                  </h4>
                  <span className="text-yellow-500 text-lg">🏆</span>
                </div>
                <div className="text-2xl font-mono font-black text-yellow-500">
                  {pr.maxWeight} <span className="text-xs text-zinc-500">{pr.maxWeightUnit || "KG"}</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-zinc-400 mt-2">
                  <span>{pr.maxWeightReps || 1} REPS {pr.estimated1RM ? `• 1RM: ~${Math.round(pr.estimated1RM)} KG` : ""}</span>
                  <span>{pr.dateAchieved ? new Date(pr.dateAchieved).toLocaleDateString("es-ES") : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN 4: ASIGNACIÓN DE PROGRAMA */}
      <section>
        <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
          ASIGNAR PROGRAMA DE ENTRENAMIENTO
        </h2>
        {programs.length === 0 ? (
          <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
            NO TIENES PROGRAMAS CREADOS EN TU BIBLIOTECA.
            <div className="mt-4">
              <Link href="/coach/programs/new" className="inline-block brutalist-button px-6 py-3 text-sm">
                + CREAR PRIMER PROGRAMA
              </Link>
            </div>
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
                <label className="block text-sm font-black text-white uppercase tracking-widest mb-4">
                  SELECCIONAR PROGRAMA MAESTRO DE TU BIBLIOTECA
                </label>
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
                        <div className="text-xs text-zinc-500 font-mono font-bold mt-1 uppercase">
                          {prog.exercises?.length || 0} EJERCICIOS {prog.split ? `• SPLIT: ${prog.split}` : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="brutalist-button w-full text-center p-5 text-xl hover:bg-white hover:text-black transition-colors"
              >
                ASIGNAR PROGRAMA A {client.name || client.email.value.split('@')[0]}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
