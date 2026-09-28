import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { UserDocument } from "@/types/user";
import { linkProfessional } from "@/actions/profile";

export const metadata: Metadata = {
  title: "Mi Perfil | HyperTrack",
  description: "Configuración de perfil y equipo de profesionales.",
};

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const db = await getDb();
  const usersCollection = db.collection<UserDocument>("users");

  // Obtener documento del usuario actual
  const user = await usersCollection.findOne({ publicId: session.sub });

  if (!user) {
    return (
      <div className="text-center text-zinc-500 py-12 font-mono">
        Error al cargar el perfil del usuario.
      </div>
    );
  }

  // Buscar profesionales vinculados si existen
  let coachDoc = null;
  let nutritionistDoc = null;

  if (user.coachId) {
    coachDoc = await usersCollection.findOne({ publicId: user.coachId });
  }

  if (user.nutritionistId) {
    nutritionistDoc = await usersCollection.findOne({ publicId: user.nutritionistId });
  }

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 font-sans">
      <header className="mb-10 border-b border-white/5 pb-6">
        <h1 className="text-3xl font-black text-zinc-100 tracking-tight">Mi Perfil</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Gestiona tu configuración y tu equipo de profesionales de salud.
        </p>
      </header>

      <main className="space-y-12">
        {/* Sección: Datos Personales (Placeholder o Resumen) */}
        <section>
          <h2 className="text-3xl font-heading font-black text-white mb-4 flex items-center gap-2 uppercase">
            <span className="text-red-600">◆</span> INFORMACIÓN PERSONAL
          </h2>
          <div className="border-2 border-zinc-800 bg-black p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 font-mono mb-1">EMAIL REGISTRADO</div>
                <div className="font-medium text-zinc-300">{user.email.value}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-mono mb-1">ID PÚBLICO</div>
                <div className="font-mono text-sm text-zinc-400">{user.publicId}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección: Mi Equipo de Profesionales */}
        <section>
          <h2 className="text-3xl font-heading font-black text-white mb-4 flex items-center gap-2 uppercase">
            <span className="text-red-600">⚡</span> MI EQUIPO DE PROFESIONALES
          </h2>
          <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-6">
            DELEGA LA GESTIÓN DE TUS MACROS Y RUTINAS VINCULANDO A TUS PROPIOS PROFESIONALES.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slot 1: Entrenador Físico */}
            <div className="group relative overflow-hidden border-2 border-zinc-800 bg-black p-6 transition-colors hover:border-red-600">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-black text-xl text-white flex items-center gap-2 uppercase">
                  <span className="bg-red-600 text-white px-2 py-1 text-sm font-bold">💪</span>
                  ENTRENADOR FÍSICO
                </h3>
                {coachDoc && (
                  <span className="flex h-3 w-3 bg-red-600 animate-pulse border border-white/20" title="Vinculado activo"></span>
                )}
              </div>

              {coachDoc ? (
                <div className="space-y-4">
                  <div className="bg-zinc-900 p-3 border-2 border-zinc-800">
                    <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest mb-1">COACH ASIGNADO</div>
                    <div className="font-bold text-white text-lg">{coachDoc.email.value}</div>
                  </div>
                  <form action={linkProfessional}>
                    <input type="hidden" name="professionalId" value="" />
                    <input type="hidden" name="roleType" value="COACH" />
                    <button className="w-full px-4 py-4 text-sm font-black text-white bg-red-600 border-2 border-transparent uppercase tracking-widest hover:bg-black hover:border-red-600 transition-colors">
                      DESVINCULAR
                    </button>
                  </form>
                </div>
              ) : (
                <form action={linkProfessional} className="space-y-4">
                  <input type="hidden" name="roleType" value="COACH" />
                  <input 
                    type="text" 
                    name="professionalId" 
                    placeholder="ID PÚBLICO (ej. usr_...)" 
                    className="bg-transparent border-b-2 border-zinc-800 text-white w-full mb-4 py-2 outline-none focus:border-red-600 uppercase font-mono tracking-widest text-sm" 
                    required 
                  />
                  <button type="submit" className="w-full px-4 py-4 text-sm font-black text-white bg-zinc-800 border-2 border-transparent uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                    VINCULAR PROFESIONAL
                  </button>
                </form>
              )}
            </div>

            {/* Slot 2: Nutricionista */}
            <div className="group relative overflow-hidden border-2 border-zinc-800 bg-black p-6 transition-colors hover:border-red-600">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-black text-xl text-white flex items-center gap-2 uppercase">
                  <span className="bg-red-600 text-white px-2 py-1 text-sm font-bold">🥑</span>
                  NUTRICIONISTA
                </h3>
                {nutritionistDoc && (
                  <span className="flex h-3 w-3 bg-red-600 animate-pulse border border-white/20" title="Vinculado activo"></span>
                )}
              </div>

              {nutritionistDoc ? (
                <div className="space-y-4">
                  <div className="bg-zinc-900 p-3 border-2 border-zinc-800">
                    <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest mb-1">NUTRICIONISTA ASIGNADO</div>
                    <div className="font-bold text-white text-lg">{nutritionistDoc.email.value}</div>
                  </div>
                  <form action={linkProfessional}>
                    <input type="hidden" name="professionalId" value="" />
                    <input type="hidden" name="roleType" value="NUTRITIONIST" />
                    <button className="w-full px-4 py-4 text-sm font-black text-white bg-red-600 border-2 border-transparent uppercase tracking-widest hover:bg-black hover:border-red-600 transition-colors">
                      DESVINCULAR
                    </button>
                  </form>
                </div>
              ) : (
                <form action={linkProfessional} className="space-y-4">
                  <input type="hidden" name="roleType" value="NUTRITIONIST" />
                  <input 
                    type="text" 
                    name="professionalId" 
                    placeholder="ID PÚBLICO (ej. usr_...)" 
                    className="bg-transparent border-b-2 border-zinc-800 text-white w-full mb-4 py-2 outline-none focus:border-red-600 uppercase font-mono tracking-widest text-sm" 
                    required 
                  />
                  <button type="submit" className="w-full px-4 py-4 text-sm font-black text-white bg-zinc-800 border-2 border-transparent uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                    VINCULAR PROFESIONAL
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
