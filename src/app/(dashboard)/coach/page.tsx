import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import type { UserDocument } from "@/types/user";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Portal del Entrenador | Roster",
  description: "Gestión de clientes, planes nutricionales y métricas de progreso.",
};

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
    case "DELETED":
      return { label: "ELIMINADO", dotColor: "bg-zinc-600", textColor: "text-zinc-500" };
    default:
      return { label: norm || "PENDIENTE", dotColor: "bg-yellow-500", textColor: "text-yellow-400" };
  }
}

export default async function CoachDashboard() {
  // 1. Obtener la sesión del Coach actual
  const session = await getSession();
  
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  // Conexión a la base de datos real
  const db = await getDb();
  
  // Buscar SOLAMENTE a los usuarios asignados a este coach
  const usersCollection = db.collection<UserDocument>("users");
  const rawClients = await usersCollection.find({ 
    role: "USER",
    coachId: session.sub
  }).toArray();

  // Mapear _id a string para evitar errores de serialización en Server Components
  const clients = rawClients.map((client) => ({
    ...client,
    _id: client._id.toString(),
  }));

  // Ejecutar el Aggregation Pipeline para Métricas
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const workoutsCol = db.collection("workout_sessions");
  const metricsRaw = await workoutsCol.aggregate([
    { 
      $match: { 
        $or: [
          { clientId: { $in: rawClients.map(c => c._id) } },
          { clientId: { $in: clients.map(c => c.publicId) } },
          { userId: { $in: clients.map(c => c.publicId) } }
        ],
        startedAt: { $gte: fourWeeksAgo } 
      } 
    },
    { $unwind: "$exercises" },
    { $unwind: "$exercises.sets" },
    { $match: { "exercises.sets.completed": true } },
    { 
      $group: { 
        _id: {
          $ifNull: [
            "$userId",
            { $toString: "$clientId" }
          ]
        },
        totalVolume: { $sum: { $multiply: ["$exercises.sets.weight", "$exercises.sets.reps"] } },
        bench1RM: { 
          $max: {
            $cond: [
              { $or: [{ $eq: ["$exercises.name", "Press de Banca"] }, { $eq: ["$exercises.exerciseName", "Press de Banca"] }] },
              { $multiply: ["$exercises.sets.weight", { $add: [1, { $divide: ["$exercises.sets.reps", 30] }] }] },
              0
            ]
          }
        },
        squat1RM: { 
          $max: {
            $cond: [
              { $or: [{ $eq: ["$exercises.name", "Sentadilla"] }, { $eq: ["$exercises.exerciseName", "Sentadilla"] }] },
              { $multiply: ["$exercises.sets.weight", { $add: [1, { $divide: ["$exercises.sets.reps", 30] }] }] },
              0
            ]
          }
        },
        deadlift1RM: { 
          $max: {
            $cond: [
              { $or: [{ $eq: ["$exercises.name", "Peso Muerto"] }, { $eq: ["$exercises.exerciseName", "Peso Muerto"] }] },
              { $multiply: ["$exercises.sets.weight", { $add: [1, { $divide: ["$exercises.sets.reps", 30] }] }] },
              0
            ]
          }
        }
      }
    }
  ]).toArray();

  const metricsByClient = metricsRaw.reduce((acc, curr) => {
    acc[curr._id] = curr;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            CLIENT ROSTER
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            SISTEMA DE MONITOREO ACTIVO // {clients.length} ATLETAS
          </p>
          <div className="mt-6">
            <Link href="/coach/programs/new" className="inline-block brutalist-button px-6 py-3 text-sm">
              + CONSTRUCTOR DE PROGRAMAS
            </Link>
          </div>
        </div>
        <div className="bg-black border-2 border-zinc-800 px-4 py-2 text-right">
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">TU ID PÚBLICO (COACH)</p>
          <p className="text-lg font-mono font-black text-red-500 select-all">{session.sub}</p>
        </div>
      </header>

      <main>
        {clients.length === 0 ? (
          <div className="brutalist-card p-10 text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
            AÚN NO TIENES CLIENTES ASIGNADOS. COMPARTE TU ID PÚBLICO ({session.sub}) CON TUS ATLETAS PARA QUE SE VINCULEN.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => {
              const clientMetrics = metricsByClient[client.publicId] || metricsByClient[client._id] || {};
              const statusCfg = getStatusBadge(client.account?.status);
              const targetUrl = `/coach/assign-program/${client.publicId}`;

              return (
                <div 
                  key={client._id}
                  className="group brutalist-card p-6 transition-all hover:border-red-600 flex flex-col justify-between"
                >
                  <div className="relative z-10">
                    {/* Cabecera Tarjeta */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 pr-2">
                        <Link href={targetUrl} className="block group-hover:text-red-500 transition-colors">
                          <h2 className="text-3xl font-heading font-black text-white group-hover:text-red-500 transition-colors uppercase truncate">
                            {client.email.value.split('@')[0]}
                          </h2>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-red-600">LVL 0</span>
                          <div className="flex items-center gap-1 bg-red-600/10 px-2 py-0.5 border border-red-600/20 text-xs font-bold text-red-500">
                            <span>ATLETA</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles del Sistema */}
                    <div className="mb-5 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                        <span>ID PÚBLICO</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-400 bg-black p-2 border-2 border-zinc-800 truncate select-all">
                        {client.publicId}
                      </div>
                    </div>

                    {/* Macros & Stats */}
                    <div className="mb-6 grid grid-cols-2 gap-3">
                      <div className="bg-black p-3 border-2 border-zinc-800 min-w-0 overflow-hidden">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1 truncate">CARGA 4 SEMANAS</div>
                        <div className="text-xl font-heading font-black text-white truncate">
                          {clientMetrics.totalVolume ? `${Math.round(clientMetrics.totalVolume).toLocaleString()} KG` : "0 KG"}
                        </div>
                      </div>
                      <div className="bg-black p-3 border-2 border-zinc-800 min-w-0 overflow-hidden flex flex-col justify-between">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1 truncate">STATUS</div>
                        <div className={`text-xs font-black flex items-center gap-1.5 mt-1 uppercase truncate ${statusCfg.textColor}`} title={statusCfg.label}>
                          <span className={`h-2 w-2 rounded-full shrink-0 animate-pulse ${statusCfg.dotColor}`} />
                          <span className="truncate">{statusCfg.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Motor 1RM Estimado */}
                    <div className="mb-6 bg-black p-4 border-2 border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-3 border-b-2 border-zinc-800 pb-2">RÉCORDS 1RM (EST.)</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-zinc-400">BENCH PRESS</span>
                          <span className="font-mono font-black text-white">{Math.round(clientMetrics.bench1RM || 0)} KG</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-zinc-400">SQUAT</span>
                          <span className="font-mono font-black text-white">{Math.round(clientMetrics.squat1RM || 0)} KG</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-zinc-400">DEADLIFT</span>
                          <span className="font-mono font-black text-white">{Math.round(clientMetrics.deadlift1RM || 0)} KG</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col gap-2 mt-auto pt-2">
                    <Link 
                      href={targetUrl}
                      className="brutalist-button w-full text-center p-3 text-sm flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors"
                    >
                      <span>HISTORIAL Y PROGRAMA</span>
                      <span className="text-red-500 font-black">→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
