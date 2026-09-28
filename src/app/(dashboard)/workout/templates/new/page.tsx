"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { createWorkoutTemplate } from "@/actions/workout";

export default function NewTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      notes: "",
      exercises: [
        {
          exerciseName: "",
          targetSets: 3,
          targetReps: "10",
          targetRestSeconds: 90
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises"
  });

  const onSubmit = (data: any) => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await createWorkoutTemplate(data);
        if (res.success) {
          router.push("/workout");
        }
      } catch (err: any) {
        setError(err.message || "Error al crear la plantilla");
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button 
          onClick={() => router.back()}
          className="text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest mb-4 inline-flex items-center gap-2"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Nueva Plantilla</h1>
        <p className="text-zinc-500 text-sm">Crea una rutina personalizada para iniciar rápidamente tus entrenamientos.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <div className="space-y-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Nombre de la Plantilla</label>
            <input 
              {...register("name", { required: true })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-white placeholder-zinc-700 outline-none transition-colors"
              placeholder="Ej: Día de Pecho Pesado"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Notas (Opcional)</label>
            <textarea 
              {...register("notes")}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-white placeholder-zinc-700 outline-none transition-colors min-h-20"
              placeholder="Enfocarse en la técnica..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Ejercicios</h2>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800 relative group">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute top-4 right-4 text-xs font-bold text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                ✕ Eliminar
              </button>
              
              <div className="mb-4 pr-20">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Nombre del Ejercicio</label>
                <input 
                  {...register(`exercises.${index}.exerciseName`, { required: true })}
                  className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-cyan-500 p-2 text-xl font-bold text-white placeholder-zinc-700 outline-none transition-colors"
                  placeholder="Ej: Press de Banca"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Series</label>
                  <input 
                    type="number"
                    {...register(`exercises.${index}.targetSets`)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-white outline-none text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Reps Objetivo</label>
                  <input 
                    {...register(`exercises.${index}.targetReps`)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-white outline-none text-center font-bold"
                    placeholder="Ej: 8-12"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Descanso (s)</label>
                  <input 
                    type="number"
                    {...register(`exercises.${index}.targetRestSeconds`)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-xl p-3 text-white outline-none text-center font-bold"
                  />
                </div>
              </div>
            </div>
          ))}

          <button 
            type="button" 
            onClick={() => append({ exerciseName: "", targetSets: 3, targetReps: "10", targetRestSeconds: 90 })}
            className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-xs font-black uppercase tracking-widest cursor-pointer"
          >
            + Añadir Ejercicio
          </button>
        </div>

        <button 
          type="submit"
          disabled={isPending}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-lg py-4 rounded-2xl transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Guardando..." : "Guardar Plantilla"}
        </button>
      </form>
    </div>
  );
}
