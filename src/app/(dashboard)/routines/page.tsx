import { RoutineForm } from "@/components/workout/RoutineForm";
import { RoutineList } from "@/components/workout/RoutineList";

export const metadata = {
  title: "Gestor de Rutinas | HyperTrack",
  description: "Administra tus plantillas de entrenamiento y asignación de días.",
};

export default function RoutinesPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Gestor de Rutinas</h1>
        <p className="text-neutral-500 mt-2">
          Crea plantillas de entrenamiento y asígnalas a días específicos de la semana.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de Creación */}
        <section>
          <RoutineForm />
        </section>

        {/* Lista de Rutinas y Gestión */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">Tus Plantillas</h2>
            <div className="h-px flex-1 bg-zinc-200"></div>
          </div>
          <RoutineList />
        </section>
      </div>
    </div>
  );
}
