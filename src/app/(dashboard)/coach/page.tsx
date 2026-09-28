import type { Metadata } from "next";
import { getDb } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import type { UserDocument } from "@/types/user";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Portal del Entrenador | Roster",
  description: "Gestión de clientes, planes nutricionales y métricas de progreso.",
};

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
    { $match: { userId: { $in: clients.map(c => c.publicId) }, startedAt: { $gte: fourWeeksAgo } } },
    { $unwind: "$exercises" },
    { $unwind: "$exercises.sets" },
    { $match: { "exercises.sets.completed": true } },
    { 
      $group: { 
        _id: "$userId",
        totalVolume: { $sum: { $multiply: ["$exercises.sets.weight", "$exercises.sets.reps"] } },
        bench1RM: { 
          $max: {
            $cond: [
              { $eq: ["$exercises.name", "Press de Banca"] },
              { $multiply: ["$exercises.sets.weight", { $add: [1, { $divide: ["$exercises.sets.reps", 30] }] }] },
              0
            ]
          }
        },
        squat1RM: { 
          $max: {
            $cond: [
              { $eq: ["$exercises.name", "Sentadilla"] },
              { $multiply: ["$exercises.sets.weight", { $add: [1, { $divide: ["$exercises.sets.reps", 30] }] }] },
              0
            ]
          }
        },
        deadlift1RM: { 
          $max: {
            $cond: [
              { $eq: ["$exercises.name", "Peso Muerto"] },
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
            <a href="/coach/programs/new" className="inline-block brutalist-button px-6 py-3 text-sm">
              + CONSTRUCTOR DE PROGRAMAS
            </a>
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
            AÚN NO TIENES CLIENTES ASIGNADOS. CONTACTA AL ADMINISTRADOR DE HYPERTRACK.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div 
                key={client._id}
                className="group brutalist-card p-6 transition-all hover:border-red-600"
              >
                <div className="relative z-10">
                  {/* Cabecera Tarjeta */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-heading font-black text-white group-hover:text-red-500 transition-colors uppercase">
                        {client.email.value.split('@')[0]}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-red-600">LVL 0</span>
                        <div className="flex items-center gap-1 bg-red-600/10 px-2 py-0.5 border border-red-600/20 text-xs font-bold text-red-500">
                          <span>0 DÍAS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalles del Sistema */}
                  <div className="mb-5 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      <span>ID PÚBLICO</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-zinc-400 bg-black p-2 border-2 border-zinc-800 truncate">
                      {client.publicId}
                    </div>
                  </div>

                  {/* Macros & Stats */}
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className="bg-black p-3 border-2 border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">CARGA 4 SEMANAS</div>
                      <div className="text-xl font-heading font-black text-white">
                        {metricsByClient[client.publicId]?.totalVolume ? `${Math.round(metricsByClient[client.publicId].totalVolume).toLocaleString()} KG` : "0 KG"}
                      </div>
                    </div>
                    <div className="bg-black p-3 border-2 border-zinc-800">
                      <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">STATUS</div>
                      <div className="text-sm font-black text-red-500 flex items-center gap-2 mt-1 uppercase">
                        <span className="h-2 w-2 bg-red-600 animate-pulse" /> {client.account.status}
                      </div>
                    </div>
                  </div>

                  {/* Motor 1RM Estimado */}
                  <div className="mb-6 bg-black p-4 border-2 border-zinc-800">
                    <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-3 border-b-2 border-zinc-800 pb-2">RÉCORDS 1RM (EST.)</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-zinc-400">BENCH PRESS</span>
                        <span className="font-mono font-black text-white">{Math.round(metricsByClient[client.publicId]?.bench1RM || 0)} KG</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-zinc-400">SQUAT</span>
                        <span className="font-mono font-black text-white">{Math.round(metricsByClient[client.publicId]?.squat1RM || 0)} KG</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-zinc-400">DEADLIFT</span>
                        <span className="font-mono font-black text-white">{Math.round(metricsByClient[client.publicId]?.deadlift1RM || 0)} KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col gap-2">
                    <a 
                      href={`/coach/assign-program/${client.publicId}`}
                      className="brutalist-button w-full text-center p-3 text-sm"
                    >
                      ASIGNAR PROGRAMA
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
