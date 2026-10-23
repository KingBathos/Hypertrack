import type { Metadata } from "next";
import { getDb } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import type { UserDocument } from "@/types/user";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portal del Nutricionista | Roster",
  description: "Gestión de protocolos nutricionales y clientes.",
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
    default:
      return { label: norm || "PENDIENTE", dotColor: "bg-yellow-500", textColor: "text-yellow-400" };
  }
}

export default async function NutritionistDashboard() {
  const session = await getSession();
  
  if (!session || (session.role !== "NUTRITIONIST" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const db = await getDb();
  
  // Buscar a los usuarios asignados a este nutricionista
  const usersCollection = db.collection<UserDocument>("users");
  const rawClients = await usersCollection.find({ 
    role: "USER",
    nutritionistId: session.sub
  }).toArray();

  const clients = rawClients.map((client) => ({
    ...client,
    _id: client._id.toString(),
  }));

  // Consultar conteo de comidas y planes activos por cliente
  const clientIds = rawClients.map(c => c._id);
  const clientPublicIds = clients.map(c => c.publicId);

  // Conteo de comidas en meal_logs
  const mealCountsRaw = await db.collection("meal_logs").aggregate([
    {
      $match: {
        $or: [
          { userId: { $in: clientIds } },
          { userId: { $in: clientPublicIds } },
          { clientId: { $in: clientIds } },
          { clientId: { $in: clientPublicIds } }
        ]
      }
    },
    {
      $group: {
        _id: { $ifNull: ["$userId", "$clientId"] },
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const mealCounts: Record<string, number> = {};
  mealCountsRaw.forEach((m: any) => {
    mealCounts[m._id?.toString()] = m.count;
  });

  // Planes nutricionales activos
  const activePlansRaw = await db.collection("nutrition_plans").find({
    clientId: { $in: clientIds },
    status: "ACTIVE"
  }).toArray();

  const activePlansByClient: Record<string, any> = {};
  activePlansRaw.forEach((p: any) => {
    activePlansByClient[p.clientId.toString()] = p;
  });

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            CLIENT ROSTER
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            SISTEMA DE MONITOREO NUTRICIONAL // {clients.length} ATLETAS
          </p>
        </div>
        <div className="bg-black border-2 border-zinc-800 px-4 py-2 text-right">
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">TU ID PÚBLICO (NUTRITIONIST)</p>
          <p className="text-lg font-mono font-black text-red-500 select-all">{session.sub}</p>
        </div>
      </header>

      <main className="space-y-8">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.length === 0 ? (
              <div className="brutalist-card p-10 col-span-full text-center text-zinc-500 font-mono font-bold uppercase text-lg border-dashed">
                AÚN NO TIENES ATLETAS ASIGNADOS. COMPARTE TU ID PÚBLICO ({session.sub}) CON TUS PACIENTES PARA QUE SE VINCULEN.
              </div>
            ) : (
              clients.map((client) => {
                const statusCfg = getStatusBadge(client.account?.status);
                const mealCount = mealCounts[client._id] || mealCounts[client.publicId] || 0;
                const activePlan = activePlansByClient[client._id];
                const planCals = activePlan?.targets?.dailyCalories || activePlan?.dailyTargets?.calories;
                const targetUrl = `/nutritionist/${client.publicId}`;

                return (
                  <div key={client._id} className="brutalist-card p-6 flex flex-col justify-between group hover:border-red-600 transition-colors bg-black">
                    <div>
                      {/* Cabecera */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0 pr-2">
                          <Link href={targetUrl} className="block group-hover:text-red-500 transition-colors">
                            <h3 className="text-2xl font-heading font-black text-white group-hover:text-red-500 transition-colors uppercase truncate">
                              {client.email.value.split('@')[0]}
                            </h3>
                          </Link>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{client.email.value}</p>
                        </div>
                      </div>

                      {/* ID Público */}
                      <div className="mb-4 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">ID PÚBLICO</div>
                        <div className="text-xs font-mono font-bold text-zinc-400 bg-black p-2 border-2 border-zinc-800 truncate select-all">
                          {client.publicId}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-black p-3 border-2 border-zinc-800 min-w-0 overflow-hidden">
                          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1 truncate">COMIDAS</div>
                          <div className="text-xl font-heading font-black text-white">
                            {mealCount} <span className="text-xs text-zinc-500">LOGS</span>
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

                      {/* Protocolo */}
                      <div className="bg-black p-3 border-2 border-zinc-800 mb-6">
                        <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mb-1">PROTOCOLO ACTIVO</div>
                        <div className="text-sm font-heading font-black text-white">
                          {planCals ? `${planCals} KCAL / DÍA` : <span className="text-zinc-600">SIN PROTOCOLO ASIGNADO</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-2">
                      <Link 
                        href={targetUrl}
                        className="brutalist-button w-full text-center p-3 text-sm flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors"
                      >
                        <span>HISTORIAL Y PROTOCOLO</span>
                        <span className="text-red-500 font-black">→</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
