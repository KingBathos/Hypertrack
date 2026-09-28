import type { Metadata } from "next";
import { getDb } from "@/lib/db/mongodb";
import type { UserDocument } from "@/types/user";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { updateUserRole } from "@/actions/admin";

export const metadata: Metadata = {
  title: "Centro de Comando | Admin",
  description: "Gestión Global del Sistema HyperTrack.",
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard");
  }
  const db = await getDb();
  const usersCollection = db.collection<UserDocument>("users");
  const workoutsCollection = db.collection("workout_sessions");
  const plansCollection = db.collection("nutrition_plans");
  const auditLogsCollection = db.collection("audit_logs");

  // Promesas en paralelo para optimizar la carga
  const [totalUsers, totalKilosRaw, activePlans, rawUsers, rawAuditLogs] = await Promise.all([
    usersCollection.countDocuments({ role: "USER" }),
    workoutsCollection.aggregate([
      { $unwind: "$exercises" },
      { $unwind: "$exercises.sets" },
      { $match: { "exercises.sets.completed": true } },
      { $group: { _id: null, totalKilos: { $sum: { $multiply: ["$exercises.sets.weight", "$exercises.sets.reps"] } } } }
    ]).toArray(),
    plansCollection.countDocuments({ status: "ACTIVE" }),
    usersCollection.find({}).sort({ "audit.createdAt": -1 }).toArray(),
    auditLogsCollection.find({}).sort({ timestamp: -1 }).limit(10).toArray()
  ]);

  const totalKilosLevantados = totalKilosRaw[0]?.totalKilos || 0;

  // Serialización segura para React Server Components
  const users = rawUsers.map((u) => ({
    ...u,
    _id: u._id.toString(),
  }));

  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            CENTRO DE COMANDO
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            <span className="text-red-600">$</span> ROOT@HYPERTRACK ~ /SYS/ADMIN
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="/admin/exercises" className="brutalist-button text-xs py-2 px-6">
            + GESTIONAR EJERCICIOS
          </a>
        </div>
      </header>

      <main className="space-y-8">
        {/* Métricas Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "TOTAL ATLETAS ACTIVOS", value: totalUsers, id: "metric_users" },
            { label: "TOTAL KILOS LEVANTADOS", value: `${Math.round(totalKilosLevantados).toLocaleString()} KG`, id: "metric_kilos" },
            { label: "PLANES NUTRICIONALES VIGENTES", value: activePlans, id: "metric_plans" },
          ].map((metric) => (
            <div 
              key={metric.id}
              className="brutalist-card p-6 border-2 border-zinc-800 hover:border-red-600 transition-colors bg-black"
            >
              <div className="relative z-10">
                <div className="text-xs text-zinc-500 mb-2 tracking-widest font-mono font-bold">{metric.label}</div>
                <div className="text-4xl md:text-5xl font-heading font-black text-white">{metric.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla de Gestión */}
        {/* Tabla de Gestión */}
        <section>
          <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
            GESTIÓN DE PERSONAL Y CLIENTES
          </h2>
          
          <div className="brutalist-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-900 text-xs text-white border-b-2 border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">EMAIL / ID PÚBLICO</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">ROL</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">ESTADO</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono text-right">ACCIONES ADMIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-800 bg-black">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 font-bold uppercase tracking-widest">
                        NO HAY USUARIOS REGISTRADOS EN EL SISTEMA.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const role = user.role || "USER";
                      return (
                        <tr key={user._id} className="hover:bg-zinc-900 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-heading font-black text-xl text-white uppercase">{user.email.value}</div>
                            <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase font-bold">{user.publicId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-black uppercase tracking-widest border-2 ${
                              role === "ADMIN" 
                                ? "bg-red-600/20 text-red-500 border-red-600"
                                : role === "COACH"
                                  ? "bg-zinc-800 text-white border-zinc-500"
                                  : role === "NUTRITIONIST"
                                    ? "bg-zinc-800 text-white border-zinc-500"
                                    : "bg-black text-zinc-400 border-zinc-800"
                            }`}>
                              {role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-mono text-white">
                              <span className={`h-2 w-2 ${user.account.status === "ACTIVE" ? "bg-red-600 animate-pulse" : "bg-zinc-600"}`} />
                              {user.account.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <form action={updateUserRole.bind(null, user.publicId)} className="flex justify-end gap-2">
                              <select 
                                name="role" 
                                defaultValue={role}
                                className="bg-black border-2 border-zinc-800 text-white font-bold text-xs uppercase px-2 py-1 focus:outline-none focus:border-red-600"
                              >
                                <option value="USER">USER</option>
                                <option value="COACH">COACH</option>
                                <option value="NUTRITIONIST">NUTRITIONIST</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                              <button 
                                type="submit"
                                className="bg-red-600 text-white font-black text-[10px] uppercase px-3 py-1 hover:bg-black hover:text-red-600 border-2 border-red-600 transition-colors"
                              >
                                APLICAR
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Radar de Auditoría */}
        <section className="mt-12">
          <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
            RADAR DE AUDITORÍA (LIVE)
          </h2>
          
          <div className="brutalist-card bg-black p-4 border-2 border-zinc-800 overflow-x-auto">
            {rawAuditLogs.length === 0 ? (
              <div className="text-zinc-500 font-mono font-bold uppercase tracking-widest p-4 text-center">NO HAY LOGS RECIENTES.</div>
            ) : (
              <div className="space-y-2">
                {rawAuditLogs.map((log: any) => (
                  <div key={log._id.toString()} className="font-mono text-xs flex gap-4 text-zinc-400 border-b border-zinc-900 pb-2">
                    <span className="text-red-500 whitespace-nowrap">[{new Date(log.timestamp).toISOString()}]</span>
                    <span className="text-white whitespace-nowrap">ACTOR: {log.actorId}</span>
                    <span className="text-zinc-500 flex-1 truncate">
                      {log.action} {'=>'} {log.targetId} {log.details && JSON.stringify(log.details)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
