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

export default async function NutritionistDashboard() {
  const session = await getSession();
  
  if (!session || (session.role !== "NUTRITIONIST" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const db = await getDb();
  
  // Buscar SOLAMENTE a los usuarios asignados a este nutricionista
  const usersCollection = db.collection<UserDocument>("users");
  const rawClients = await usersCollection.find({ 
    role: "USER",
    nutritionistId: session.sub
  }).toArray();

  const clients = rawClients.map((client) => ({
    ...client,
    _id: client._id.toString(),
  }));

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            CLIENT ROSTER
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            SISTEMA DE MONITOREO NUTRICIONAL
          </p>
        </div>
        <div className="bg-black border-2 border-zinc-800 px-4 py-2 text-right">
          <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">TU ID PÚBLICO (NUTRITIONIST)</p>
          <p className="text-lg font-mono font-black text-red-500 select-all">{session.sub}</p>
        </div>
      </header>

      <main className="space-y-8">
        <section>
          <h2 className="text-3xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
            ATLETAS ACTIVOS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.length === 0 ? (
              <div className="brutalist-card p-10 col-span-full text-center">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-lg">No tienes atletas asignados.</p>
              </div>
            ) : (
              clients.map((client) => (
                <div key={client._id} className="brutalist-card p-6 flex flex-col justify-between group hover:border-red-600 transition-colors bg-black">
                  <div>
                    <h3 className="text-2xl font-heading font-black text-white uppercase">{client.email.value}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-2 font-bold">{client.publicId}</p>
                  </div>
                  
                  <div className="mt-8 flex gap-3">
                    <Link 
                      href={`/nutritionist/${client.publicId}`}
                      className="brutalist-button flex-1 text-center py-3 text-sm"
                    >
                      ESTABLECER MACROS
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
