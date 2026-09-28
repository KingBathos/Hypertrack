"use client";

import { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { createTrainingProgram } from "@/actions/workout";
import { useRouter } from "next/navigation";

export default function ProgramBuilder({ initialExercises }: { initialExercises: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      goal: "HYPERTROPHY",
      level: "INTERMEDIATE",
      exercises: [
        { exerciseId: "", targetSets: 3, targetReps: 10, targetRpe: 8 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "exercises"
  });

  const onSubmit = (data: any) => {
    startTransition(async () => {
      try {
        // Mapear exerciseId a exerciseName para el backend
        const mappedData = {
          ...data,
          exercises: data.exercises.map((e: any) => {
            const found = initialExercises.find(ix => ix.publicId === e.exerciseId);
            return {
              ...e,
              exerciseName: found ? found.name : "Desconocido"
            };
          })
        };
        await createTrainingProgram(mappedData);
        router.push("/coach");
      } catch (err) {
        alert("Error al crear programa");
      }
    });
  };

  return (
    <div className="brutalist-card p-6 md:p-10">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div>
          <label className="block text-sm font-black text-white uppercase tracking-widest mb-2">NOMBRE DEL PROGRAMA</label>
          <input 
            {...register("name", { required: true })}
            placeholder="EJ. HIPERTROFIA ESTRICTA FPL"
            className="w-full bg-black border-2 border-zinc-800 px-4 py-4 text-xl font-heading font-black text-white focus:outline-none focus:border-red-600 transition-all uppercase"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-black text-white uppercase tracking-widest mb-2">OBJETIVO PRINCIPAL</label>
            <select 
              {...register("goal", { required: true })}
              className="w-full bg-black border-2 border-zinc-800 px-4 py-4 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase"
            >
              <option value="HYPERTROPHY">HIPERTROFIA</option>
              <option value="FAT_LOSS">PÉRDIDA DE GRASA</option>
              <option value="STRENGTH">FUERZA MAXIMA</option>
              <option value="ENDURANCE">RESISTENCIA</option>
              <option value="RECOMPOSITION">RECOMPOSICIÓN</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-black text-white uppercase tracking-widest mb-2">NIVEL</label>
            <select 
              {...register("level", { required: true })}
              className="w-full bg-black border-2 border-zinc-800 px-4 py-4 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase"
            >
              <option value="BEGINNER">PRINCIPIANTE</option>
              <option value="INTERMEDIATE">INTERMEDIO</option>
              <option value="ADVANCED">AVANZADO</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end border-b-2 border-zinc-800 pb-2">
            <h3 className="text-xl font-heading font-black text-white uppercase tracking-widest">BLOQUE DE EJERCICIOS</h3>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="bg-black border-2 border-zinc-800 p-4 relative group">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute top-2 right-2 text-zinc-600 hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-all text-xs uppercase"
              >
                ✕ ELIMINAR
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-2">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1 uppercase">EJERCICIO</label>
                  <select 
                    {...register(`exercises.${index}.exerciseId`, { required: true })}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-red-600 uppercase"
                  >
                    <option value="">SELECCIONA UN EJERCICIO...</option>
                    {initialExercises.map(ex => (
                      <option key={ex.publicId} value={ex.publicId}>{ex.name} ({ex.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1 uppercase">TARGET SETS</label>
                  <input 
                    type="number" 
                    {...register(`exercises.${index}.targetSets`)}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-center font-black text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1 uppercase">TARGET REPS</label>
                  <input 
                    type="number" 
                    {...register(`exercises.${index}.targetReps`)}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-center font-black text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-mono font-bold mb-1 uppercase">TARGET RPE</label>
                  <input 
                    type="number" 
                    step="0.5"
                    {...register(`exercises.${index}.targetRpe`)}
                    className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-center font-black text-red-600 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => append({ exerciseId: "", targetSets: 3, targetReps: 10, targetRpe: 8 })}
            className="w-full py-5 border-2 border-dashed border-zinc-800 text-zinc-500 font-black hover:border-red-600 hover:text-red-500 transition-colors bg-black uppercase tracking-widest"
          >
            + AÑADIR EJERCICIO
          </button>
        </div>

        <button 
          type="submit"
          disabled={isPending}
          className="brutalist-button w-full text-center p-5 text-xl"
        >
          {isPending ? "GUARDANDO PROGRAMA..." : "GUARDAR PROGRAMA MAESTRO"}
        </button>
      </form>
    </div>
  );
}
