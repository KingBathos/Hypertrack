import type { Metadata } from "next";
import { getDb } from "@/lib/db/mongodb";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { addExercise, deleteExercise } from "@/actions/admin";

export const metadata: Metadata = {
  title: "Gestión de Ejercicios | Admin",
};

export default async function AdminExercisesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const db = await getDb();
  const rawExercises = await db.collection("exercise_library").find({}).sort({ "audit.createdAt": -1 }).toArray();

  const exercises = rawExercises.map(e => ({
    publicId: e.publicId,
    name: e.name,
    primaryMuscle: e.primaryMuscle,
    equipment: e.equipment,
    mechanic: e.mechanic,
    _id: e._id.toString()
  }));

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
            LIBRERÍA DE EJERCICIOS
          </h1>
          <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
            <span className="text-red-600">$</span> ADMIN / EJERCICIOS_DB
          </p>
        </div>
        <a href="/admin" className="brutalist-button text-xs py-2 px-6">
          ← VOLVER AL COMANDO
        </a>
      </header>

      <main className="space-y-12">
        {/* ADD EXERCISE FORM */}
        <section className="brutalist-card p-6 md:p-8 bg-black border-2 border-zinc-800">
          <h2 className="text-2xl font-heading font-black text-white mb-6 uppercase border-l-4 border-red-600 pl-4">
            AÑADIR NUEVO EJERCICIO
          </h2>
          <form action={addExercise} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-black text-white uppercase tracking-widest mb-2">NOMBRE DEL EJERCICIO</label>
              <input 
                name="name"
                required
                placeholder="EJ. PRESS DE BANCA"
                className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-white uppercase tracking-widest mb-2">MÚSCULO PRINCIPAL</label>
              <select name="primaryMuscle" required className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase">
                <option value="CHEST">PECHO (CHEST)</option>
                <option value="BACK">ESPALDA (BACK)</option>
                <option value="LEGS">PIERNAS (LEGS)</option>
                <option value="SHOULDERS">HOMBROS (SHOULDERS)</option>
                <option value="BICEPS">BÍCEPS</option>
                <option value="TRICEPS">TRÍCEPS</option>
                <option value="CORE">CORE / ABS</option>
                <option value="CALVES">PANTORRILLAS (CALVES)</option>
                <option value="GLUTES">GLÚTEOS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-white uppercase tracking-widest mb-2">MECÁNICA</label>
              <select name="mechanic" required className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase">
                <option value="COMPOUND">COMPUESTO (COMPOUND)</option>
                <option value="ISOLATION">AISLAMIENTO (ISOLATION)</option>
                <option value="ISOMETRIC">ISOMÉTRICO (ISOMETRIC)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-white uppercase tracking-widest mb-2">EQUIPAMIENTO</label>
              <select name="equipment" required className="w-full bg-zinc-900 border-2 border-zinc-800 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase">
                <option value="BARBELL">BARRA (BARBELL)</option>
                <option value="DUMBBELL">MANCUERNA (DUMBBELL)</option>
                <option value="MACHINE">MÁQUINA (MACHINE)</option>
                <option value="CABLE">POLEA (CABLE)</option>
                <option value="BODYWEIGHT">PESO CORPORAL (BODYWEIGHT)</option>
                <option value="KETTLEBELL">PESA RUSA (KETTLEBELL)</option>
                <option value="OTHER">OTRO</option>
              </select>
            </div>
            <div className="lg:col-span-4 mt-4">
              <button type="submit" className="brutalist-button w-full py-4 text-sm">
                + REGISTRAR EJERCICIO EN BD
              </button>
            </div>
          </form>
        </section>

        {/* EXERCISES TABLE */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-zinc-800 pb-2 mb-4">
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-widest">
              CATÁLOGO ACTUAL ({exercises.length})
            </h3>
          </div>
          
          <div className="brutalist-card p-0 overflow-hidden border-2 border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-900 text-xs text-white border-b-2 border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">NOMBRE</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">MÚSCULO</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">EQUIPO</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono">MECÁNICA</th>
                    <th className="px-6 py-4 font-black tracking-widest uppercase font-mono text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-800 bg-black">
                  {exercises.map((exe) => (
                    <tr key={exe.publicId} className="hover:bg-zinc-900 transition-colors">
                      <td className="px-6 py-4 font-bold text-white uppercase">{exe.name}</td>
                      <td className="px-6 py-4 font-mono font-bold uppercase">{exe.primaryMuscle}</td>
                      <td className="px-6 py-4 font-mono font-bold uppercase">{exe.equipment}</td>
                      <td className="px-6 py-4 font-mono font-bold uppercase">{exe.mechanic}</td>
                      <td className="px-6 py-4 text-right">
                        <form action={async () => {
                          "use server";
                          await deleteExercise(exe.publicId);
                        }}>
                          <button type="submit" className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-600 px-3 py-1 border border-red-500 hover:border-red-600 transition-colors uppercase">
                            ELIMINAR
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
