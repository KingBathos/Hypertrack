import { getExercises } from "@/actions/workout";
import ProgramBuilder from "./ProgramBuilder";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewProgramPage() {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const exercises = await getExercises();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-12 border-b-4 border-red-600 pb-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black text-white uppercase tracking-tighter">
          CONSTRUCTOR DE PROGRAMAS
        </h1>
        <p className="mt-2 text-lg text-zinc-400 font-mono uppercase tracking-widest font-bold">
          DISEÑA EL MASTER PLAN PARA TUS ATLETAS
        </p>
      </header>

      <ProgramBuilder initialExercises={exercises} />
    </div>
  );
}
